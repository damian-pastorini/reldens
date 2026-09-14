# Entities Generation Guide

## When to regenerate

Run this process after any database schema change: new tables, added/removed columns, changed foreign keys.

## Prerequisites

- `.env` file must be present in the project root with valid DB credentials (`RELDENS_DB_*`) and the storage driver (`RELDENS_STORAGE_DRIVER`, `knex` by default)
- The target table(s) must already exist in the database before running

## Steps

### 1. Apply the SQL migration

Run the relevant migration file against the database directly (e.g. `migrations/development/beta.39.X-sql-update.sql`).

### 2. Regenerate all entities

```bash
npx reldens generateEntities --override
```

The `--override` flag forces regeneration of all existing entity and model files, not just new or changed ones.

This updates:
- `generated-entities/entities/[table]-entity.js`
- `generated-entities/models/[driver]/[table]-model.js` (`generated-entities/models/knex/` by default)
- `generated-entities/models/[driver]/registered-models-[driver].js`
- `generated-entities/entities-config.js`
- `generated-entities/entities-translations.js`

Only the models of the active driver are written, the other `generated-entities/models/` folders are left untouched. The reldens repository keeps only the `knex` models, regenerate with a different `RELDENS_STORAGE_DRIVER` to produce the models of an optional driver.

## Optional Prisma driver

When `RELDENS_STORAGE_DRIVER=prisma`, refresh the Prisma schema and client before the entities generation:

```bash
npx reldens-storage-prisma --host=localhost --port=3306 --database=YOUR_DB_NAME --user=YOUR_USER --password=YOUR_PASS
npx reldens generateEntities --override
```

The output goes to `./prisma/schema.prisma` and `./prisma/client/`, and `prisma.config.js` is written at the project root reading `RELDENS_DB_URL` from `.env`.

## Notes

- The `RELDENS_DB_CLIENT=mysql2` setting in `.env` is automatically normalized to `mysql` when the driver is `prisma` (Prisma does not support the `mysql2://` URL scheme).
- The Prisma client path defaults to `./prisma/client` relative to the project root.
- If running from a different folder than the installed app is needed, copy the app `.env` into that folder first.
