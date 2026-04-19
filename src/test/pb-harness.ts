/**
 * Per-test-file PocketBase harness for Vitest.
 *
 * Usage:
 *   describe("my domain", () => {
 *     const getHarness = usePbHarness();
 *     const ctx = () => ({ pb: getHarness().admin });
 *
 *     it("does the thing", async () => {
 *       await myDomainFunction(ctx(), input);
 *     });
 *   });
 *
 * Each test file boots its own PB process on a free port with a fresh tmp data
 * dir; migrations from pb_migrations/ apply on first serve; records are
 * truncated between tests. Safe to run in parallel Vitest workers.
 *
 * Requires ./bin/pocketbase (run `pnpm pb:setup` first).
 */

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import PocketBase from "pocketbase";
import { afterAll, beforeAll, beforeEach } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const PB_BIN = join(REPO_ROOT, "bin", "pocketbase");
const MIGRATIONS_DIR = join(REPO_ROOT, "pb_migrations");

const SUPERUSER_EMAIL = "test@stowage.local";
const SUPERUSER_PASSWORD = "test-password-12345";

export type PbHarness = {
  url: string;
  admin: PocketBase;
  reset: () => Promise<void>;
  cleanup: () => Promise<void>;
};

/**
 * Boot a fresh PocketBase instance on a random port with a tmp data dir.
 * Migrations run on first serve, a superuser is upserted for admin access.
 * Each call is isolated — safe to run in parallel Vitest workers.
 */
export async function bootPb(): Promise<PbHarness> {
  const port = await getFreePort();
  const dataDir = mkdtempSync(join(tmpdir(), "stowage-pb-"));
  const url = `http://127.0.0.1:${port}`;

  execFileSync(
    PB_BIN,
    [
      "superuser",
      "upsert",
      SUPERUSER_EMAIL,
      SUPERUSER_PASSWORD,
      "--dir",
      dataDir,
    ],
    { stdio: "ignore" },
  );

  let proc: ChildProcess | null = null;

  const cleanup = async () => {
    if (proc && proc.exitCode === null) {
      proc.kill("SIGTERM");
      await new Promise<void>((done) => {
        const deadline = setTimeout(() => {
          proc?.kill("SIGKILL");
          done();
        }, 2000);
        proc?.once("exit", () => {
          clearTimeout(deadline);
          done();
        });
      });
    }
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  };

  try {
    proc = spawn(
      PB_BIN,
      [
        "serve",
        `--http=127.0.0.1:${port}`,
        "--dir",
        dataDir,
        "--migrationsDir",
        MIGRATIONS_DIR,
      ],
      { stdio: "ignore" },
    );

    proc.on("error", (err) => {
      console.error("[pb-harness] process error", err);
    });

    await waitForHealth(url);

    const admin = new PocketBase(url);
    admin.autoCancellation(false);
    await admin
      .collection("_superusers")
      .authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);

    return {
      url,
      admin,
      reset: () => truncateUserCollections(admin),
      cleanup,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

/**
 * Installs Vitest lifecycle hooks that boot a harness before all tests in the
 * suite, reset record data between tests, and tear the harness down at the end.
 * Returns a getter so tests read the current harness inside `it` callbacks.
 */
export function usePbHarness(): () => PbHarness {
  let harness: PbHarness | null = null;

  beforeAll(async () => {
    harness = await bootPb();
  }, 15_000);

  afterAll(async () => {
    await harness?.cleanup();
    harness = null;
  });

  beforeEach(async () => {
    await harness?.reset();
  });

  return () => {
    if (!harness) {
      throw new Error(
        "pb harness accessed before beforeAll — check your test ordering",
      );
    }
    return harness;
  };
}

async function getFreePort(): Promise<number> {
  return await new Promise((resolveFn, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (typeof address === "object" && address) {
        const port = address.port;
        srv.close(() => resolveFn(port));
      } else {
        srv.close(() => reject(new Error("unable to determine free port")));
      }
    });
  });
}

async function waitForHealth(url: string, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 75));
  }
  throw new Error(
    `pocketbase health check timed out at ${url}: ${String(lastError)}`,
  );
}

// Collections are deleted in reverse FK order so required relations resolve
// during each individual record delete. Unlisted user collections are still
// truncated, just after the known ones (which cover every FK dependency edge).
const TRUNCATION_ORDER = [
  "labelTemplates",
  "serviceRecordAttachments",
  "serviceRecords",
  "serviceSchedules",
  "attachments",
  "assetTags",
  "assets",
  "serviceProviders",
  "serviceGroupFields",
  "serviceGroups",
  "appSettings",
  "customFieldDefinitions",
  "locations",
  "tags",
  "categories",
  "users",
];

async function truncateUserCollections(pb: PocketBase) {
  const collections = await pb.collections.getFullList();
  const eligible = collections.filter(
    (col) => !col.system && col.type !== "view" && !col.name.startsWith("_"),
  );
  const byName = new Map(eligible.map((c) => [c.name, c]));

  const order: string[] = [];
  for (const name of TRUNCATION_ORDER) {
    if (byName.has(name)) {
      order.push(name);
      byName.delete(name);
    }
  }
  for (const name of byName.keys()) order.push(name);

  for (const name of order) {
    const records = await pb.collection(name).getFullList({ batch: 200 });
    for (const rec of records) {
      await pb.collection(name).delete(rec.id);
    }
  }
}
