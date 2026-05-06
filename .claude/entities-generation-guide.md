# Entities Generation Guide

## When to regenerate

Run this process after any database schema change: new tables, added/removed columns, changed foreign keys.

## Prerequisites

- `.env` file must be present in the project root (`reldens/`) with valid DB credentials
- The target table(s) must already exist in the database before running

## Steps

### 1. Apply the SQL migration

Run the relevant migration file against the database directly (e.g. `migrations/development/beta.39.X-sql-update.sql`).

### 2. Generate the Prisma schema and client

This must be run before entity generation when using the Prisma driver. It introspects the database and regenerates the Prisma schema and client:

```bash
npx reldens-storage-prisma --host=localhost --port=3306 --database=YOUR_DB_NAME --user=YOUR_USER --password=YOUR_PASS
```

Reads credentials from `.env` automatically via `dotenvx`. The output goes to `./prisma/schema.prisma` and `./prisma/client/`.

### 3. Regenerate all entities

```bash
npx reldens generateEntities --override
```

The `--override` flag forces regeneration of all existing entity and model files, not just new or changed ones.

This updates:
- `generated-entities/entities/[table]-entity.js`
- `generated-entities/models/prisma/[table]-model.js`
- `generated-entities/models/prisma/registered-models-prisma.js`
- `generated-entities/entities-config.js`
- `generated-entities/entities-translations.js`

## Notes

- The `RELDENS_DB_CLIENT=mysql2` setting in `.env` is automatically normalized to `mysql` when the driver is `prisma` (Prisma does not support the `mysql2://` URL scheme).
- The Prisma client path defaults to `./prisma/client` relative to the project root. This is separate from the app's `./app/prisma/client` - both must be in sync when running from the reldens folder.
- If running from the app folder is needed instead, copy `.env` from `./app/` into the project root first.
