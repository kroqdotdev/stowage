#!/usr/bin/env node
/**
 * Seed a batch of demo locations, categories, tags, assets, service
 * schedules and service records so the mobile shell has something to walk
 * through on a phone. Idempotent: records created previously with the DEMO-*
 * prefix are removed before new ones are written.
 *
 *   pnpm pb:seed
 *
 * Reads POCKETBASE_URL, POCKETBASE_SUPERUSER_EMAIL and
 * POCKETBASE_SUPERUSER_PASSWORD from the process env (the pnpm script loads
 * .env.local).
 */

import PocketBase from "pocketbase";

const DEMO_PREFIX = "DEMO";

function env(name, fallback) {
  const value = process.env[name];
  if (value && value.trim()) return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${name}`);
}

function todayIso(offsetDays = 0) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() + offsetDays);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function now() {
  return Date.now();
}

async function main() {
  const url = env("POCKETBASE_URL", "http://127.0.0.1:8090");
  const email = env("POCKETBASE_SUPERUSER_EMAIL");
  const password = env("POCKETBASE_SUPERUSER_PASSWORD");

  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(email, password);
  console.log(`authenticated superuser @ ${url}`);

  const ownerId = await resolveOwnerId(pb, email);
  console.log(`attributing seed records to user ${ownerId}`);

  await clearPreviousDemoData(pb);
  console.log("cleared previous DEMO- records");

  const categoryIds = await seedCategories(pb, ownerId);
  console.log(
    `seeded ${Object.keys(categoryIds).length} categories`,
  );
  const tagIds = await seedTags(pb);
  console.log(`seeded ${Object.keys(tagIds).length} tags`);
  const locationIds = await seedLocations(pb);
  console.log(`seeded ${Object.keys(locationIds).length} locations`);
  const groupIds = await seedServiceGroups(pb, ownerId);
  console.log(`seeded ${Object.keys(groupIds).length} service groups`);
  const providerIds = await seedProviders(pb, ownerId);
  console.log(`seeded ${Object.keys(providerIds).length} service providers`);

  const assetRefs = await seedAssets(pb, {
    ownerId,
    categoryIds,
    locationIds,
    groupIds,
  });
  console.log(`seeded ${assetRefs.length} assets`);

  const tagLinks = await seedAssetTags(pb, assetRefs, tagIds, ownerId);
  console.log(`linked ${tagLinks} asset-tags`);

  const schedules = await seedServiceSchedules(pb, assetRefs, ownerId);
  console.log(`seeded ${schedules} service schedules`);

  const records = await seedServiceRecords(pb, {
    assetRefs,
    groupIds,
    providerIds,
    ownerId,
  });
  console.log(`seeded ${records} service records`);

  console.log("\ndone — reload the app to see the demo data");
}

async function resolveOwnerId(pb, superuserEmail) {
  const direct = await pb
    .collection("users")
    .getFirstListItem(`email = "${escapeFilter(superuserEmail)}"`, {
      $autoCancel: false,
    })
    .catch(() => null);
  if (direct) return direct.id;

  const admin = await pb
    .collection("users")
    .getFirstListItem('role = "admin"', { $autoCancel: false })
    .catch(() => null);
  if (admin) return admin.id;

  const anyone = await pb
    .collection("users")
    .getList(1, 1, { $autoCancel: false })
    .then((result) => result.items[0] ?? null)
    .catch(() => null);
  if (anyone) return anyone.id;

  throw new Error(
    "No app users found — create one at /setup first, then rerun the seed.",
  );
}

function escapeFilter(value) {
  return value.replace(/"/g, '\\"');
}

async function clearPreviousDemoData(pb) {
  const collections = [
    {
      name: "assets",
      filter: `assetTag ~ "${DEMO_PREFIX}-%"`,
    },
    {
      name: "categories",
      filter: 'name ~ "(DEMO)"',
    },
    {
      name: "tags",
      filter: 'name ~ "(DEMO)"',
    },
    {
      name: "locations",
      filter: 'name ~ "(DEMO)"',
    },
    {
      name: "serviceGroups",
      filter: 'name ~ "(DEMO)"',
    },
    {
      name: "serviceProviders",
      filter: 'name ~ "(DEMO)"',
    },
  ];

  for (const { name, filter } of collections) {
    const rows = await pb
      .collection(name)
      .getFullList({ filter, $autoCancel: false })
      .catch(() => []);
    for (const row of rows) {
      await pb.collection(name).delete(row.id, { $autoCancel: false });
    }
  }
}

async function seedCategories(pb, ownerId) {
  const entries = [
    {
      key: "power",
      name: "Power tools (DEMO)",
      prefix: "PT",
      color: "#C2410C",
    },
    {
      key: "hand",
      name: "Hand tools (DEMO)",
      prefix: "HT",
      color: "#6B8E6B",
    },
    {
      key: "it",
      name: "IT equipment (DEMO)",
      prefix: "IT",
      color: "#2563EB",
    },
    {
      key: "vehicle",
      name: "Vehicles (DEMO)",
      prefix: "VH",
      color: "#D97706",
    },
  ];
  const out = {};
  for (const entry of entries) {
    const record = await pb.collection("categories").create(
      {
        name: entry.name,
        normalizedName: entry.name.toLowerCase(),
        prefix: entry.prefix,
        color: entry.color,
        description: null,
        createdAt: now(),
        updatedAt: now(),
        createdBy: ownerId,
        updatedBy: ownerId,
      },
      { $autoCancel: false },
    );
    out[entry.key] = record.id;
  }
  return out;
}

async function seedTags(pb) {
  const entries = [
    { key: "electric", name: "electric (DEMO)", color: "#F59E0B" },
    { key: "cordless", name: "cordless (DEMO)", color: "#0D9488" },
    { key: "critical", name: "critical (DEMO)", color: "#DC2626" },
    { key: "rentable", name: "rentable (DEMO)", color: "#6366F1" },
    { key: "legacy", name: "legacy (DEMO)", color: "#737373" },
  ];
  const out = {};
  for (const entry of entries) {
    const record = await pb.collection("tags").create(
      {
        name: entry.name,
        normalizedName: entry.name.toLowerCase(),
        color: entry.color,
        createdAt: now(),
        updatedAt: now(),
      },
      { $autoCancel: false },
    );
    out[entry.key] = record.id;
  }
  return out;
}

async function seedLocations(pb) {
  const roots = [
    {
      key: "workshop",
      name: "Workshop (DEMO)",
      children: [
        { key: "bench1", name: "Bench 1 (DEMO)" },
        { key: "bench2", name: "Bench 2 (DEMO)" },
        { key: "bench3", name: "Bench 3 (DEMO)" },
        {
          key: "wshelves",
          name: "Shelves (DEMO)",
          children: [
            { key: "shelfA", name: "Shelf A (DEMO)" },
            { key: "shelfB", name: "Shelf B (DEMO)" },
          ],
        },
      ],
    },
    {
      key: "office",
      name: "Office (DEMO)",
      children: [
        { key: "serverroom", name: "Server room (DEMO)" },
        { key: "deskA", name: "Desk A (DEMO)" },
        { key: "deskB", name: "Desk B (DEMO)" },
      ],
    },
    {
      key: "warehouse",
      name: "Warehouse (DEMO)",
      children: [
        { key: "loadingbay", name: "Loading bay (DEMO)" },
        { key: "coldstorage", name: "Cold storage (DEMO)" },
      ],
    },
  ];

  const out = {};

  async function createNode(parentId, parentPath, node) {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    const record = await pb.collection("locations").create(
      {
        name: node.name,
        normalizedName: node.name.toLowerCase(),
        description: null,
        parentId: parentId ?? null,
        path,
        createdAt: now(),
        updatedAt: now(),
      },
      { $autoCancel: false },
    );
    out[node.key] = record.id;
    for (const child of node.children ?? []) {
      await createNode(record.id, path, child);
    }
  }

  for (const root of roots) {
    await createNode(null, "", root);
  }
  return out;
}

async function seedServiceGroups(pb, ownerId) {
  const entries = [
    { key: "quarterly", name: "Quarterly inspection (DEMO)" },
    { key: "annual", name: "Annual service (DEMO)" },
  ];
  const out = {};
  for (const entry of entries) {
    const record = await pb.collection("serviceGroups").create(
      {
        name: entry.name,
        normalizedName: entry.name.toLowerCase(),
        description: null,
        createdAt: now(),
        updatedAt: now(),
        createdBy: ownerId,
        updatedBy: ownerId,
      },
      { $autoCancel: false },
    );
    out[entry.key] = record.id;
  }
  return out;
}

async function seedProviders(pb, ownerId) {
  const entries = [
    { key: "acme", name: "Acme Service Co. (DEMO)" },
    { key: "roadside", name: "Roadside Repair (DEMO)" },
  ];
  const out = {};
  for (const entry of entries) {
    const record = await pb.collection("serviceProviders").create(
      {
        name: entry.name,
        normalizedName: entry.name.toLowerCase(),
        contactEmail: null,
        contactPhone: null,
        notes: null,
        createdAt: now(),
        updatedAt: now(),
        createdBy: ownerId,
        updatedBy: ownerId,
      },
      { $autoCancel: false },
    );
    out[entry.key] = record.id;
  }
  return out;
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

async function seedAssets(pb, { ownerId, categoryIds, locationIds, groupIds }) {
  const base = [
    {
      name: "Cordless drill",
      category: "power",
      location: "bench1",
      status: "active",
      group: "quarterly",
      notes: "Bought 2024. DeWalt brand.",
    },
    {
      name: "Impact driver",
      category: "power",
      location: "bench1",
      status: "active",
      group: "quarterly",
    },
    {
      name: "Circular saw",
      category: "power",
      location: "bench2",
      status: "under_repair",
      group: "quarterly",
      notes: "Blade guard stuck.",
    },
    {
      name: "Table saw",
      category: "power",
      location: "bench3",
      status: "active",
      group: "annual",
    },
    {
      name: "Claw hammer",
      category: "hand",
      location: "shelfA",
      status: "active",
      group: null,
    },
    {
      name: "Adjustable wrench",
      category: "hand",
      location: "shelfA",
      status: "in_storage",
      group: null,
    },
    {
      name: "Tape measure",
      category: "hand",
      location: "shelfB",
      status: "active",
      group: null,
    },
    {
      name: "Level (900mm)",
      category: "hand",
      location: "shelfB",
      status: "active",
      group: null,
    },
    {
      name: "Rack router",
      category: "it",
      location: "serverroom",
      status: "active",
      group: "annual",
      notes: "Primary uplink.",
    },
    {
      name: "UPS (2kVA)",
      category: "it",
      location: "serverroom",
      status: "active",
      group: "annual",
    },
    {
      name: "Laptop dock",
      category: "it",
      location: "deskA",
      status: "active",
      group: null,
    },
    {
      name: "External monitor",
      category: "it",
      location: "deskB",
      status: "retired",
      group: null,
    },
    {
      name: "Forklift",
      category: "vehicle",
      location: "loadingbay",
      status: "active",
      group: "annual",
      notes: "Service overdue — see logs.",
    },
    {
      name: "Walk-behind pallet jack",
      category: "vehicle",
      location: "loadingbay",
      status: "in_storage",
      group: null,
    },
    {
      name: "Refrigerated unit",
      category: "vehicle",
      location: "coldstorage",
      status: "active",
      group: "quarterly",
    },
  ];

  const refs = [];
  let sequence = 1;
  for (const entry of base) {
    const categoryId = categoryIds[entry.category];
    const locationId = locationIds[entry.location];
    const serviceGroupId = entry.group ? groupIds[entry.group] : null;
    const assetTag = `${DEMO_PREFIX}-${pad(sequence, 3)}`;
    sequence += 1;
    const record = await pb.collection("assets").create(
      {
        name: `${entry.name} (DEMO)`,
        normalizedName: `${entry.name} (demo)`.toLowerCase(),
        assetTag,
        status: entry.status,
        categoryId,
        locationId,
        serviceGroupId,
        notes: entry.notes ?? null,
        customFieldValues: {},
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: now(),
        updatedAt: now(),
      },
      { $autoCancel: false },
    );
    refs.push({
      id: record.id,
      name: record.name,
      tag: assetTag,
      category: entry.category,
      status: entry.status,
      group: entry.group,
    });
  }
  return refs;
}

async function seedAssetTags(pb, assets, tagIds, ownerId) {
  const tagPlan = [
    { category: "power", tags: ["electric", "cordless"] },
    { category: "hand", tags: ["legacy"] },
    { category: "it", tags: ["critical"] },
    { category: "vehicle", tags: ["critical", "rentable"] },
  ];
  let count = 0;
  for (const asset of assets) {
    const plan = tagPlan.find((p) => p.category === asset.category);
    if (!plan) continue;
    for (const tagKey of plan.tags) {
      const tagId = tagIds[tagKey];
      if (!tagId) continue;
      await pb.collection("assetTags").create(
        {
          assetId: asset.id,
          tagId,
          createdBy: ownerId,
          createdAt: now(),
        },
        { $autoCancel: false },
      );
      count += 1;
    }
  }
  return count;
}

async function seedServiceSchedules(pb, assets, ownerId) {
  // Pick one schedule date per asset that has a service group. Mix the
  // buckets deliberately so every section of the services list has rows.
  const offsets = [-30, -5, 3, 12, 25, 60, 120];
  let oi = 0;
  let count = 0;
  for (const asset of assets) {
    if (!asset.group) continue;
    const offset = offsets[oi % offsets.length];
    oi += 1;
    const nextServiceDate = todayIso(offset);
    const reminderStartOffset = offset - 5;
    const reminderStart =
      reminderStartOffset >= 0 ? todayIso(reminderStartOffset) : todayIso(0);
    await pb.collection("serviceSchedules").create(
      {
        assetId: asset.id,
        nextServiceDate,
        intervalValue: 3,
        intervalUnit: "months",
        reminderLeadValue: 5,
        reminderLeadUnit: "days",
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: now(),
        updatedAt: now(),
      },
      { $autoCancel: false },
    );
    // Reminder date is derived from interval, but PocketBase doesn't care —
    // the service-schedules domain computes it on read.
    void reminderStart;
    count += 1;
  }
  return count;
}

async function seedServiceRecords(
  pb,
  { assetRefs, groupIds, providerIds, ownerId },
) {
  // Give a couple of assets a completed service record in the past.
  const plan = [
    {
      tag: `${DEMO_PREFIX}-001`,
      daysAgo: 40,
      description: "Replaced brushes, lubricated gears.",
      cost: 18.5,
      group: "quarterly",
      provider: "acme",
    },
    {
      tag: `${DEMO_PREFIX}-013`,
      daysAgo: 120,
      description: "Annual inspection — tires, hydraulics, brakes.",
      cost: 240,
      group: "annual",
      provider: "roadside",
    },
  ];
  let count = 0;
  for (const entry of plan) {
    const asset = assetRefs.find((a) => a.tag === entry.tag);
    if (!asset) continue;
    await pb.collection("serviceRecords").create(
      {
        assetId: asset.id,
        serviceGroupId: groupIds[entry.group] ?? null,
        serviceGroupNameSnapshot: null,
        values: {},
        fieldSnapshots: [],
        scheduleId: null,
        scheduledForDate: null,
        serviceDate: todayIso(-entry.daysAgo),
        description: entry.description,
        cost: entry.cost,
        providerId: providerIds[entry.provider] ?? null,
        completedAt: now() - entry.daysAgo * 24 * 60 * 60 * 1000,
        completedBy: ownerId,
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: now(),
        updatedAt: now(),
      },
      { $autoCancel: false },
    );
    count += 1;
  }
  return count;
}

main().catch((err) => {
  console.error("seed failed:");
  console.error(err?.response?.data ?? err);
  process.exit(1);
});
