/// <reference path="../pb_data/types.d.ts" />

// Initial schema migration: categories collection only (spike scope).
// The remaining collections (assets, tags, locations, users, ...) land in
// milestone 3 once the spike has validated the wiring end-to-end.
migrate(
  (app) => {
    const collection = new Collection({
      type: "base",
      name: "categories",
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          max: 200,
        },
        {
          name: "normalizedName",
          type: "text",
          required: true,
          max: 200,
        },
        {
          name: "prefix",
          type: "text",
          required: false,
          max: 50,
        },
        {
          name: "description",
          type: "text",
          required: false,
          max: 2000,
        },
        {
          name: "color",
          type: "text",
          required: true,
          pattern: "^#[0-9A-F]{6}$",
        },
        {
          name: "createdAt",
          type: "number",
          required: true,
        },
        {
          name: "updatedAt",
          type: "number",
          required: true,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_categories_normalized_name ON categories (normalizedName)",
      ],
      // Spike note: keep permissive rules for now; authz comes in milestone 3.
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("categories");
    app.delete(collection);
  },
);
