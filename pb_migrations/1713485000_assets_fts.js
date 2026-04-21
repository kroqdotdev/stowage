/// <reference path="../pb_data/types.d.ts" />

// FTS5 virtual table + triggers for weighted asset search.
//
// Search fields: name, assetTag, notes. Query-side ordering boosts exact
// assetTag equality above name matches (bm25 alone would treat them as a
// flat weighted search). See src/server/domain/search.ts once it lands.
migrate(
  (app) => {
    app
      .db()
      .newQuery(
        `CREATE VIRTUAL TABLE assets_fts USING fts5(
           id UNINDEXED,
           name,
           assetTag,
           notes,
           tokenize='unicode61 remove_diacritics 1'
         )`,
      )
      .execute();

    app
      .db()
      .newQuery(
        `CREATE TRIGGER assets_fts_ai AFTER INSERT ON assets BEGIN
           INSERT INTO assets_fts(id, name, assetTag, notes)
           VALUES (new.id, new.name, new.assetTag, COALESCE(new.notes, ''));
         END`,
      )
      .execute();

    app
      .db()
      .newQuery(
        `CREATE TRIGGER assets_fts_ad AFTER DELETE ON assets BEGIN
           DELETE FROM assets_fts WHERE id = old.id;
         END`,
      )
      .execute();

    app
      .db()
      .newQuery(
        `CREATE TRIGGER assets_fts_au AFTER UPDATE ON assets BEGIN
           DELETE FROM assets_fts WHERE id = old.id;
           INSERT INTO assets_fts(id, name, assetTag, notes)
           VALUES (new.id, new.name, new.assetTag, COALESCE(new.notes, ''));
         END`,
      )
      .execute();
  },
  (app) => {
    for (const stmt of [
      "DROP TRIGGER IF EXISTS assets_fts_au",
      "DROP TRIGGER IF EXISTS assets_fts_ad",
      "DROP TRIGGER IF EXISTS assets_fts_ai",
      "DROP TABLE IF EXISTS assets_fts",
    ]) {
      try {
        app.db().newQuery(stmt).execute();
      } catch (_e) {
        // ignore
      }
    }
  },
);
