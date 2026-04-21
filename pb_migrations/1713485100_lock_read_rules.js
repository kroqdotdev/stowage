/// <reference path="../pb_data/types.d.ts" />

const AUTHENTICATED_RULE = "@request.auth.id != ''";

const COLLECTIONS = [
  "users",
  "categories",
  "tags",
  "locations",
  "customFieldDefinitions",
  "appSettings",
  "serviceGroups",
  "serviceGroupFields",
  "serviceProviders",
  "assets",
  "assetTags",
  "attachments",
  "serviceSchedules",
  "serviceRecords",
  "serviceRecordAttachments",
  "labelTemplates",
];

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      collection.listRule = AUTHENTICATED_RULE;
      collection.viewRule = AUTHENTICATED_RULE;
      app.save(collection);
    }
  },
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      collection.listRule = "";
      collection.viewRule = "";
      app.save(collection);
    }
  },
);
