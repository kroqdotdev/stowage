/// <reference path="../pb_data/types.d.ts" />

// Full schema for the remaining Stowage collections (milestone 3a).
// Created in FK order so relations resolve at save time. The `categories`
// collection already exists from 1713484800_initial.js.
//
// Spike-scope auth rules are permissive; milestone 3b tightens them alongside
// the PocketBase auth provider refactor.
migrate(
  (app) => {
    // --- users (extend PB's default auth collection) -----------------------
    // fields.add() expects Field class instances (not plain objects).
    // Default `name` field (max 255, not required) stays as-is; our API layer
    // enforces the actual name rules via Zod.
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(
      new SelectField({
        name: "role",
        required: true,
        maxSelect: 1,
        values: ["admin", "user"],
      }),
    );
    users.fields.add(new NumberField({ name: "createdAt", required: true }));
    users.fields.add(
      new TextField({ name: "phone", required: false, max: 50 }),
    );
    users.fields.add(
      new NumberField({ name: "phoneVerificationTime", required: false }),
    );
    users.fields.add(new BoolField({ name: "isAnonymous", required: false }));
    users.indexes = [
      ...users.indexes,
      "CREATE INDEX idx_users_phone ON users (phone)",
      "CREATE INDEX idx_users_role ON users (role)",
    ];
    app.save(users);

    const usersId = users.id;
    users.fields.add(
      new RelationField({
        name: "createdBy",
        required: false,
        collectionId: usersId,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    );
    app.save(users);

    // --- tags --------------------------------------------------------------
    const tags = new Collection({
      type: "base",
      name: "tags",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "normalizedName", type: "text", required: true, max: 200 },
        {
          name: "color",
          type: "text",
          required: true,
          pattern: "^#[0-9A-F]{6}$",
        },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_tags_normalized_name ON tags (normalizedName)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(tags);

    // --- locations (self-referencing hierarchy) ----------------------------
    const locations = new Collection({
      type: "base",
      name: "locations",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "normalizedName", type: "text", required: true, max: 200 },
        { name: "description", type: "text", required: false, max: 2000 },
        { name: "path", type: "text", required: true, max: 4000 },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(locations);
    const locationsId = locations.id;
    locations.fields.add(
      new RelationField({
        name: "parentId",
        required: false,
        collectionId: locationsId,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    );
    locations.indexes = [
      "CREATE INDEX idx_locations_parent ON locations (parentId)",
      "CREATE UNIQUE INDEX idx_locations_parent_name ON locations (parentId, normalizedName)",
    ];
    app.save(locations);

    // --- customFieldDefinitions --------------------------------------------
    const customFields = new Collection({
      type: "base",
      name: "customFieldDefinitions",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        {
          name: "fieldType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "text",
            "number",
            "date",
            "dropdown",
            "checkbox",
            "url",
            "currency",
          ],
        },
        { name: "options", type: "json", required: false },
        { name: "required", type: "bool", required: false },
        // sortOrder starts at 0, usageCount starts at 0 — PB treats required
        // number fields as rejecting zero, so we enforce non-null in Zod.
        { name: "sortOrder", type: "number", required: false },
        { name: "usageCount", type: "number", required: false },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
      ],
      indexes: [
        "CREATE INDEX idx_custom_fields_sort_order ON customFieldDefinitions (sortOrder)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(customFields);

    // --- appSettings (single-row) ------------------------------------------
    const appSettings = new Collection({
      type: "base",
      name: "appSettings",
      fields: [
        { name: "key", type: "text", required: true, max: 50 },
        {
          name: "dateFormat",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"],
        },
        { name: "serviceSchedulingEnabled", type: "bool", required: false },
        { name: "updatedAt", type: "number", required: true },
        {
          name: "updatedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_app_settings_key ON appSettings (key)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(appSettings);

    // --- serviceGroups -----------------------------------------------------
    const serviceGroups = new Collection({
      type: "base",
      name: "serviceGroups",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "normalizedName", type: "text", required: true, max: 200 },
        { name: "description", type: "text", required: false, max: 2000 },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
        {
          name: "createdBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "updatedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_service_groups_normalized_name ON serviceGroups (normalizedName)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(serviceGroups);
    const serviceGroupsId = serviceGroups.id;

    // --- serviceGroupFields ------------------------------------------------
    const serviceGroupFields = new Collection({
      type: "base",
      name: "serviceGroupFields",
      fields: [
        {
          name: "groupId",
          type: "relation",
          required: true,
          collectionId: serviceGroupsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: "label", type: "text", required: true, max: 200 },
        { name: "normalizedLabel", type: "text", required: true, max: 200 },
        {
          name: "fieldType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["text", "textarea", "number", "date", "checkbox", "select"],
        },
        { name: "required", type: "bool", required: false },
        { name: "options", type: "json", required: false },
        // sortOrder can be 0; see customFieldDefinitions note above.
        { name: "sortOrder", type: "number", required: false },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
        {
          name: "createdBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "updatedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
      ],
      indexes: [
        "CREATE INDEX idx_sgf_group_sort ON serviceGroupFields (groupId, sortOrder)",
        "CREATE UNIQUE INDEX idx_sgf_group_label ON serviceGroupFields (groupId, normalizedLabel)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(serviceGroupFields);

    // --- serviceProviders --------------------------------------------------
    const serviceProviders = new Collection({
      type: "base",
      name: "serviceProviders",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "normalizedName", type: "text", required: true, max: 200 },
        { name: "contactEmail", type: "text", required: false, max: 320 },
        { name: "contactPhone", type: "text", required: false, max: 50 },
        { name: "notes", type: "text", required: false, max: 4000 },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
        {
          name: "createdBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "updatedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_service_providers_normalized_name ON serviceProviders (normalizedName)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(serviceProviders);
    const serviceProvidersId = serviceProviders.id;

    // --- assets ------------------------------------------------------------
    const categoriesCollection = app.findCollectionByNameOrId("categories");
    const assets = new Collection({
      type: "base",
      name: "assets",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "normalizedName", type: "text", required: true, max: 200 },
        { name: "assetTag", type: "text", required: true, max: 50 },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "active",
            "in_storage",
            "under_repair",
            "retired",
            "disposed",
          ],
        },
        {
          name: "categoryId",
          type: "relation",
          required: false,
          collectionId: categoriesCollection.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "locationId",
          type: "relation",
          required: false,
          collectionId: locationsId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "serviceGroupId",
          type: "relation",
          required: false,
          collectionId: serviceGroupsId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "notes", type: "text", required: false, max: 10000 },
        { name: "customFieldValues", type: "json", required: false },
        {
          name: "createdBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "updatedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_assets_asset_tag ON assets (assetTag)",
        "CREATE INDEX idx_assets_created_at ON assets (createdAt)",
        "CREATE INDEX idx_assets_category ON assets (categoryId)",
        "CREATE INDEX idx_assets_status ON assets (status)",
        "CREATE INDEX idx_assets_location ON assets (locationId)",
        "CREATE INDEX idx_assets_service_group ON assets (serviceGroupId)",
        "CREATE INDEX idx_assets_normalized_name ON assets (normalizedName)",
        "CREATE INDEX idx_assets_updated_at ON assets (updatedAt)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(assets);
    const assetsId = assets.id;

    // --- assetTags (join table) --------------------------------------------
    const assetTags = new Collection({
      type: "base",
      name: "assetTags",
      fields: [
        {
          name: "assetId",
          type: "relation",
          required: true,
          collectionId: assetsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "tagId",
          type: "relation",
          required: true,
          collectionId: tags.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "createdBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "createdAt", type: "number", required: true },
      ],
      indexes: [
        "CREATE INDEX idx_asset_tags_asset ON assetTags (assetId)",
        "CREATE INDEX idx_asset_tags_tag ON assetTags (tagId)",
        "CREATE UNIQUE INDEX idx_asset_tags_asset_tag ON assetTags (assetId, tagId)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(assetTags);

    // --- attachments -------------------------------------------------------
    const attachments = new Collection({
      type: "base",
      name: "attachments",
      fields: [
        {
          name: "assetId",
          type: "relation",
          required: true,
          collectionId: assetsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "storageFile",
          type: "file",
          required: false,
          maxSelect: 1,
          maxSize: 26214400,
        },
        {
          name: "originalFile",
          type: "file",
          required: false,
          maxSelect: 1,
          maxSize: 26214400,
        },
        { name: "fileName", type: "text", required: true, max: 500 },
        { name: "fileType", type: "text", required: true, max: 200 },
        { name: "fileExtension", type: "text", required: false, max: 20 },
        {
          name: "fileKind",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["image", "pdf", "office"],
        },
        { name: "fileSizeOriginal", type: "number", required: true },
        { name: "fileSizeOptimized", type: "number", required: false },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending", "processing", "ready", "failed"],
        },
        // optimizationAttempts starts at 0; see customFieldDefinitions note above.
        { name: "optimizationAttempts", type: "number", required: false },
        { name: "optimizationError", type: "text", required: false, max: 2000 },
        {
          name: "uploadedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "uploadedAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
      ],
      indexes: [
        "CREATE INDEX idx_attachments_asset ON attachments (assetId)",
        "CREATE INDEX idx_attachments_asset_uploaded ON attachments (assetId, uploadedAt)",
        "CREATE INDEX idx_attachments_status ON attachments (status)",
        "CREATE INDEX idx_attachments_asset_status ON attachments (assetId, status)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(attachments);

    // --- serviceSchedules --------------------------------------------------
    const serviceSchedules = new Collection({
      type: "base",
      name: "serviceSchedules",
      fields: [
        {
          name: "assetId",
          type: "relation",
          required: true,
          collectionId: assetsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: "nextServiceDate", type: "text", required: true, max: 25 },
        { name: "intervalValue", type: "number", required: true },
        {
          name: "intervalUnit",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["days", "weeks", "months", "years"],
        },
        // reminderLeadValue can be 0 (same reminder day as service); see note.
        { name: "reminderLeadValue", type: "number", required: false },
        {
          name: "reminderLeadUnit",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["days", "weeks", "months", "years"],
        },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
        {
          name: "createdBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "updatedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
      ],
      indexes: [
        "CREATE INDEX idx_service_schedules_asset ON serviceSchedules (assetId)",
        "CREATE INDEX idx_service_schedules_next_date ON serviceSchedules (nextServiceDate)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(serviceSchedules);
    const serviceSchedulesId = serviceSchedules.id;

    // --- serviceRecords ----------------------------------------------------
    const serviceRecords = new Collection({
      type: "base",
      name: "serviceRecords",
      fields: [
        {
          name: "assetId",
          type: "relation",
          required: true,
          collectionId: assetsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "serviceGroupId",
          type: "relation",
          required: false,
          collectionId: serviceGroupsId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "serviceGroupNameSnapshot",
          type: "text",
          required: false,
          max: 200,
        },
        { name: "values", type: "json", required: false },
        { name: "fieldSnapshots", type: "json", required: false },
        {
          name: "scheduleId",
          type: "relation",
          required: false,
          collectionId: serviceSchedulesId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "scheduledForDate", type: "text", required: false, max: 25 },
        { name: "serviceDate", type: "text", required: false, max: 25 },
        { name: "description", type: "text", required: false, max: 10000 },
        { name: "cost", type: "number", required: false },
        {
          name: "providerId",
          type: "relation",
          required: false,
          collectionId: serviceProvidersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "completedAt", type: "number", required: true },
        {
          name: "completedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
      ],
      indexes: [
        "CREATE INDEX idx_service_records_asset_completed ON serviceRecords (assetId, completedAt)",
        "CREATE INDEX idx_service_records_group_completed ON serviceRecords (serviceGroupId, completedAt)",
        "CREATE INDEX idx_service_records_provider ON serviceRecords (providerId)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(serviceRecords);
    const serviceRecordsId = serviceRecords.id;

    // --- serviceRecordAttachments ------------------------------------------
    const serviceRecordAttachments = new Collection({
      type: "base",
      name: "serviceRecordAttachments",
      fields: [
        {
          name: "serviceRecordId",
          type: "relation",
          required: true,
          collectionId: serviceRecordsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "storageFile",
          type: "file",
          required: false,
          maxSelect: 1,
          maxSize: 26214400,
        },
        { name: "fileName", type: "text", required: true, max: 500 },
        { name: "fileType", type: "text", required: true, max: 200 },
        { name: "fileExtension", type: "text", required: false, max: 20 },
        {
          name: "fileKind",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["image", "pdf", "office"],
        },
        { name: "fileSize", type: "number", required: true },
        {
          name: "uploadedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "uploadedAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
      ],
      indexes: [
        "CREATE INDEX idx_sra_record ON serviceRecordAttachments (serviceRecordId)",
        "CREATE INDEX idx_sra_record_uploaded ON serviceRecordAttachments (serviceRecordId, uploadedAt)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(serviceRecordAttachments);

    // --- labelTemplates ----------------------------------------------------
    const labelTemplates = new Collection({
      type: "base",
      name: "labelTemplates",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "normalizedName", type: "text", required: true, max: 200 },
        { name: "widthMm", type: "number", required: true },
        { name: "heightMm", type: "number", required: true },
        { name: "elements", type: "json", required: false },
        { name: "isDefault", type: "bool", required: false },
        { name: "createdAt", type: "number", required: true },
        { name: "updatedAt", type: "number", required: true },
        {
          name: "createdBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "updatedBy",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_label_templates_normalized_name ON labelTemplates (normalizedName)",
        "CREATE INDEX idx_label_templates_is_default ON labelTemplates (isDefault)",
      ],
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(labelTemplates);
  },
  (app) => {
    const order = [
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
    ];
    for (const name of order) {
      try {
        const collection = app.findCollectionByNameOrId(name);
        app.delete(collection);
      } catch (_e) {
        // collection may not exist in partial rollbacks; ignore
      }
    }
    // Strip the fields we added to PB's default users collection. We do not
    // delete the collection itself — PB recreates it on boot.
    try {
      const users = app.findCollectionByNameOrId("users");
      for (const name of [
        "createdBy",
        "isAnonymous",
        "phoneVerificationTime",
        "phone",
        "createdAt",
        "role",
      ]) {
        const field = users.fields.getByName(name);
        if (field) users.fields.remove(field.id);
      }
      app.save(users);
    } catch (_e) {
      // best-effort rollback
    }
  },
);
