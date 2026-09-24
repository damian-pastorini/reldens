# Storage & Entity Management Architecture

Complete reference for the storage system and entity management.

## Entity Generation Workflow

1. Define database schema (SQL migrations in `migrations/`)
2. Run `reldens generateEntities --override` (reads the `.env` credentials and `RELDENS_STORAGE_DRIVER`)
3. Entities are generated in `generated-entities/` (entities, config, translations and the models of the active driver)
4. Admin panel overrides in each feature `server/entities/` extend the generated entities

## Storage Drivers

- `knex` (default): the only driver bundled with `@reldens/storage`, MySQL/MariaDB through `mysql2`, plain query builder with relations loaded through the `relationMappings` data emitted into the generated models
- `kysely` (optional, requires `kysely`): type safe query builder, same query builder base as Knex
- `drizzle` (optional, requires `drizzle-orm`): same query builder base as Knex, models emit the Drizzle column builders
- `objection-js` (optional, requires `objection@3.1.5`): Knex based ORM with `withGraphFetched` relations, kept for existing projects
- `mikro-orm` (optional, requires `@mikro-orm/core` and `@mikro-orm/mysql`, plus `@mikro-orm/mongodb` when the client is MongoDB): entity schemas, the only driver with MongoDB support
- `prisma` (optional, requires `prisma`, `@prisma/client` and a driver adapter, `@prisma/adapter-mariadb` by default): schema first, requires the Prisma client generation before the entities generation
- Configured via `RELDENS_STORAGE_DRIVER` in `.env`; the optional drivers are only usable when their packages resolve from the project `node_modules`

## Driver Modules Resolution

`@reldens/storage` does not depend on the optional packages. Every data server receives its driver classes through a `[driver]Modules` prop (`knexModules`, `kyselyModules`, `drizzleModules`, `objectionModules`, `mikroOrmModules`, `prismaModules`), validated on `connect()`.

Reldens resolves those props from the project root through the `@reldens/cms` `StorageDriversResolver` (`lib/storage-drivers-resolver.js`):

- `StorageDriversResolver.available(projectRoot, prismaAdapter)` lists the drivers whose packages resolve (Knex always)
- `StorageDriversResolver.modulesProp(driverKey)` gives the data server prop name
- `StorageDriversResolver.loadModules(driverKey, projectRoot, client)` loads the modules through the `@reldens/storage` loaders (`KnexModulesLoader`, `KyselyModulesLoader`, `DrizzleModulesLoader`, `ObjectionModulesLoader`, `MikroOrmModulesLoader`)

The Prisma modules are built by `DataServerInitializer.loadProjectPrismaModules()` from the project `prisma/client` and the adapter package (`RELDENS_PRISMA_ADAPTER` / `RELDENS_PRISMA_ADAPTER_CLASS`, read by `EnvironmentVariablesReader.fetchPrismaAdapterFromEnvironmentVariables()` into the `server/prismaAdapter` configuration), or reused from the installer data server right after the installation. `PrismaDataServer` creates the client with the connection string from `DataServerConfig`.

## Entity Access and Storage System Architecture

### CRITICAL: Understanding getEntity() Return Type

`dataServer.getEntity()` returns a `BaseDriver` instance from `@reldens/storage`, NOT an Entity or Model class.

**What getEntity() Returns:**
```javascript
// Returns BaseDriver instance (KnexDriver by default, or the optional driver subclass)
let statsRepository = this.dataServer.getEntity('stats');

// BaseDriver provides unified interface across all storage drivers:
await statsRepository.create({key: 'hp', label: 'Health Points'});
await statsRepository.loadAll();
await statsRepository.loadBy('key', 'hp');
await statsRepository.loadOneBy('key', 'hp');
await statsRepository.updateById(1, {label: 'HP'});
await statsRepository.deleteById(1);
```

**Type Annotation for Repository Properties:**
```javascript
/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 */

// Correct - driver-agnostic type
/** @type {BaseDriver} */
this.statsRepository = this.dataServer.getEntity('stats');

// WRONG - Entity classes are for admin panel config only
/** @type {StatsEntity} */
this.statsRepository = this.dataServer.getEntity('stats');

// WRONG - Model classes are driver-specific
/** @type {StatsModel} */
this.statsRepository = this.dataServer.getEntity('stats');
```

## Storage System Component Breakdown

### 1. Entity Classes (`generated-entities/entities/[table]-entity.js`)
- Purpose: Admin panel configuration ONLY
- Define property metadata (types, required fields, display names)
- Define edit/show/list properties for admin UI
- Example: `StatsEntity.propertiesConfig()` returns admin panel config
- Never used for database operations

### 2. Model Classes (`generated-entities/models/[driver]/[table]-model.js`)
- Purpose: driver-specific model definitions
- The repository keeps only `generated-entities/models/knex/`, the optional drivers models are generated on demand with `RELDENS_STORAGE_DRIVER` set to the driver key
- Knex models are plain classes with `tableName`, `idColumn` (when it is not `id`) and `relationMappings` data (`{relation, tableName, from, to}`)
- Wrapped by BaseDriver before use

### 3. BaseDriver (`@reldens/storage/lib/base-driver.js`)
- Purpose: Unified database interface
- Wraps raw Model classes
- Provides consistent API across all storage drivers
- THIS IS WHAT `getEntity()` RETURNS
- Methods: create, load, loadBy, loadOneBy, update, delete, count, etc.
- Driver implementations: `KnexDriver`, `KyselyDriver` and `DrizzleDriver` (all extending `QueryBuilderDriver`), `ObjectionJsDriver`, `MikroOrmDriver`, `PrismaDriver`

### 4. BaseDataServer (`@reldens/storage/lib/base-data-server.js`)
- Purpose: Manages database connection and entity registry
- Has `EntityManager` for storing BaseDriver instances
- `getEntity(key)` retrieves BaseDriver from EntityManager
- Driver implementations: `KnexDataServer`, `KyselyDataServer`, `DrizzleDataServer`, `ObjectionJsDataServer` (extends `KnexDataServer`), `MikroOrmDataServer`, `PrismaDataServer`
- Every key is mapped in the `@reldens/storage` `DriversMap` export

## Entity Loading Flow

1. `DataServerConfig.prepareDbConfig()` (lib/game/server/data-server-config.js)
   - Reads `RELDENS_STORAGE_DRIVER` (default: `knex`), `RELDENS_DB_CLIENT` (default: `mysql2`) and the `RELDENS_DB_*` connection values

2. `EntitiesLoader.loadEntities()` (lib/game/server/entities-loader.js)
   - Loads `generated-entities/models/{driver}/registered-models-{driver}.js`
   - Merges the plugins `server/entities-config.js`, `server/entities-translations.js` and the implementation overrides
   - Returns `{entities, entitiesRaw, translations}`

3. `DataServerInitializer.initializeEntitiesAndDriver()` (lib/game/server/data-server-initializer.js)
   - Resolves the driver modules for the configured driver (`StorageDriversResolver` for every driver but Prisma, `loadProjectPrismaModules()` for Prisma)
   - Creates the DataServer instance: `new DriversMap[storageDriver](dataServerConfig)`
   - `ServerManager.initializeStorage()` then connects it and calls `generateEntities()` so the BaseDriver instances are stored in the EntityManager registry

4. `dataServer.getEntity(key)` returns BaseDriver from EntityManager

## Usage Examples

```javascript
// 1. Basic CRUD operations
let statsRepo = this.dataServer.getEntity('stats');
let newStat = await statsRepo.create({key: 'hp', label: 'Health'});
let allStats = await statsRepo.loadAll();
let hpStat = await statsRepo.loadOneBy('key', 'hp');
await statsRepo.updateById(hpStat.id, {base_value: 100});

// 2. With relations
let skillData = await this.dataServer
    .getEntity('skillsClassLevelUpAnimations')
    .loadAllWithRelations();

// 3. Accessing related data from loaded instances
let classPathModel = await this.dataServer.getEntity('skillsClassPath').loadById(1);
let relatedSkills = classPathModel.related_skills_levels_set.related_skills_levels;
```

## Important Notes

- ALWAYS use `BaseDriver` type for repository properties
- Entity classes are NEVER used for database operations
- Model classes are wrapped by BaseDriver - never accessed directly
- Storage driver is configurable: `knex` (default), `kysely`, `drizzle`, `objection-js`, `mikro-orm`, `prisma`
- Relations can be nested
- Entity relations keys are defined in `generated-entities/entities-config.js`
- Custom entity overrides are in `lib/[plugin-folder]/server/entities`

## Generated Entities Structure

The `generated-entities/` directory contains:
- `entities/` - 77 auto-generated entity classes for all database tables
- `models/knex/` - the Knex models plus `registered-models-knex.js`
- `entities-config.js` - Entity relationship mappings and configuration
- `entities-translations.js` - Translation/label mappings for admin panel

Generating the entities for an optional driver creates `models/[driver]/` next to the Knex one; only the active driver models are refreshed on every run, the other folders drift and must be regenerated when switching back.

## Entity Overrides and Database Defaults

**Auto-Populated Fields:**

Some fields should be auto-populated by the database or application logic, not manually entered through the admin panel.

**Example: scores_detail.kill_time**
```javascript
// Database schema (migrations/production/reldens-install-v4.0.0.sql)
// `kill_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

// Entity override (lib/scores/server/entities/scores-detail-entity-override.js)
class ScoresDetailEntityOverride extends ScoresDetailEntity {
    static propertiesConfig(extraProps) {
        let config = super.propertiesConfig(extraProps);
        // Remove kill_time from admin panel edit form
        config.editProperties.splice(config.editProperties.indexOf('kill_time'), 1);
        return config;
    }
}

// Game logic auto-populates when creating through code
// (lib/scores/server/scores-updater.js)
let scoreDetailData = {
    player_id: attacker.player_id,
    obtained_score: obtainedScore,
    kill_time: sc.formatDate(new Date()),
    kill_player_id: props.killPlayerId || null,
    kill_npc_id: props.killNpcId || null,
};
```

**How It Works:**
1. Field removed from `editProperties` - not shown in admin panel
2. Database has `DEFAULT CURRENT_TIMESTAMP` - auto-fills when missing
3. Game logic explicitly sets value when creating programmatically
4. The Knex driver passes the data as is, so the database applies the default; the Prisma driver skips its required fields validation for the fields with database defaults

## Optional Prisma Driver (Prisma 7+)

Prisma 7 removed support for the `url` property inside the `datasource` block of `schema.prisma`. The connection URL must be provided via a `prisma.config.js` file at the project root.

### How it is created during installation

`PrismaSubprocessWorker` (`lib/game/server/installer/prisma-subprocess-worker.js`) runs these steps in order:

1. `generator.generateSchemaFile()` - writes `prisma/schema.prisma` with an empty datasource block (no `url`)
2. `generator.setDatabaseEnvironmentVariables()` - sets `process.env.RELDENS_DB_URL` from the installer config
3. `generator.generateConfigFile()` - writes `prisma.config.js` at the project root:
   ```js
   process.loadEnvFile('.env');
   module.exports = { datasource: { url: process.env.RELDENS_DB_URL } };
   ```
4. `npx prisma generate` - reads the URL from `prisma.config.js`
5. `MySQLInstaller.createPrismaClient()` (from `@reldens/cms`) builds the `prismaModules` object (`PrismaClient`, `Prisma`, the adapter and the client) used to run the SQL scripts

Then `EntitiesInstallation` regenerates the full schema (`npx prisma db pull` plus `npx prisma generate`) in the main process and attaches the `prismaModules` to the installer data server, which is reused by the runtime right after the installation.

### Connection URL: `RELDENS_DB_URL` only

Reldens uses the single env var `RELDENS_DB_URL` everywhere - the generated `prisma.config.js`, the generation subprocess, the installer, and the runtime adapter. `DATABASE_URL` is not used or required. The generated `prisma.config.js` loads `.env` explicitly via `process.loadEnvFile()` (Node 20.12+ native) because the Prisma CLI does not auto-load `.env` for config files in Prisma 7.

### Adapter

The adapter package and class come from `RELDENS_PRISMA_ADAPTER` (default `@prisma/adapter-mariadb`) and `RELDENS_PRISMA_ADAPTER_CLASS` (default `PrismaMariaDb`); the installer installs `prisma`, `@prisma/client` and the adapter when the packages installation is allowed.

### `generateEntities` command

`reldens generateEntities` spawns `npx reldens-storage generateEntities --driver=prisma`, which loads the existing `prisma/client` and the adapter from the project `node_modules`. Run `npx prisma db pull` and `npx prisma generate` first after a schema change.
