# Storage & Entity Management Architecture

Complete reference for the storage system and entity management.

## Entity Generation Workflow

1. Define database schema (SQL migrations in `migrations/`)
2. Run `reldens generateEntities --override`
3. Entities are generated in `generated-entities/`
4. Models in each feature's `server/models/` extend generated entities

## Storage Drivers

- `objection-js` (default was objection-js): Uses Knex.js for SQL, direct database access, no validation
- `mikro-orm`: ORM with decorators, supports MongoDB
- `prisma` (current default): Modern ORM with type safety, custom validation, database default support
- Configured via `RELDENS_STORAGE_DRIVER` in `.env`

## Driver Differences

### ObjectionJS
- Direct SQL via Knex query builder
- No field validation before database
- Database handles defaults and constraints
- Foreign keys as direct field values
- Less informative error messages

### Prisma
- Type-safe Prisma Client
- Custom `ensureRequiredFields()` validation before database
- Skips validation for fields with database defaults
- Foreign keys use relation connect syntax: `{players: {connect: {id: 1001}}}`
- VARCHAR foreign key support
- Better error messages for missing required fields
- Metadata-driven field type casting

## Entity Access and Storage System Architecture

### CRITICAL: Understanding getEntity() Return Type

`dataServer.getEntity()` returns a `BaseDriver` instance from `@reldens/storage`, NOT an Entity or Model class.

**What getEntity() Returns:**
```javascript
// Returns BaseDriver instance (or ObjectionJsDriver, PrismaDriver, MikroOrmDriver subclass)
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
/** @type {StatsEntity} */  // ❌ WRONG
this.statsRepository = this.dataServer.getEntity('stats');

// WRONG - Model classes are driver-specific (objection-js/prisma/mikro-orm)
/** @type {StatsModel} */  // ❌ WRONG
this.statsRepository = this.dataServer.getEntity('stats');
```

## Storage System Component Breakdown

### 1. Entity Classes (`generated-entities/entities/[table]-entity.js`)
- Purpose: Admin panel configuration ONLY
- Define property metadata (types, required fields, display names)
- Define edit/show/list properties for admin UI
- Example: `StatsEntity.propertiesConfig()` returns admin panel config
- Never used for database operations

### 2. Model Classes (`generated-entities/models/{driver}/[table]-model.js`)
- Purpose: ORM-specific model definitions
- Driver-specific paths:
  - `models/objection-js/stats-model.js` - ObjectionJS
  - `models/prisma/stats-model.js` - Prisma
  - `models/mikro-orm/stats-model.js` - MikroORM
- Define table names, relations, schema
- Wrapped by BaseDriver before use

### 3. BaseDriver (`@reldens/storage/lib/base-driver.js`)
- Purpose: Unified database interface
- Wraps raw Model classes
- Provides consistent API across all storage drivers
- THIS IS WHAT `getEntity()` RETURNS
- Methods: create, load, loadBy, loadOneBy, update, delete, count, etc.
- Driver implementations:
  - `ObjectionJsDriver` - uses Knex query builder
  - `PrismaDriver` - uses Prisma Client
  - `MikroOrmDriver` - uses MikroORM EntityManager

### 4. BaseDataServer (`@reldens/storage/lib/base-data-server.js`)
- Purpose: Manages database connection and entity registry
- Has `EntityManager` for storing BaseDriver instances
- `getEntity(key)` retrieves BaseDriver from EntityManager
- Driver implementations:
  - `ObjectionJsDataServer`
  - `PrismaDataServer`
  - `MikroOrmDataServer`

## Entity Loading Flow

1. `EntitiesLoader.loadEntities()` (lib/game/server/entities-loader.js:41)
   - Checks `RELDENS_STORAGE_DRIVER` env var (default: 'prisma')
   - Loads from `generated-entities/models/{driver}/registered-models-{driver}.js`
   - Returns `{entities, entitiesRaw, translations}`

2. `DataServerInitializer.initializeEntitiesAndDriver()` (lib/game/server/data-server-initializer.js:55)
   - Creates DataServer instance: `new DriversMap[storageDriver](config)`
   - DataServer generates BaseDriver instances for each entity
   - Stores in EntityManager registry

3. `dataServer.getEntity(key)` returns BaseDriver from EntityManager

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
- Storage driver is configurable: objection-js, prisma (default), mikro-orm
- Relations can be nested
- Entity relations keys are defined in `generated-entities/entities-config.js`
- Custom entity overrides are in `lib/[plugin-folder]/server/entities` or `lib/[plugin-folder]/server/models`

## Generated Entities Structure

The `generated-entities/` directory contains:
- `entities/` - 60+ auto-generated entity classes for all database tables
- `models/` - Custom entity overrides (extend generated entities)
- `entities-config.js` - Entity relationship mappings and configuration
- `entities-translations.js` - Translation/label mappings for admin panel

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
    kill_time: sc.formatDate(new Date()),  // Auto-populated
    kill_player_id: props.killPlayerId || null,
    kill_npc_id: props.killNpcId || null,
};
```

**How It Works:**
1. Field removed from `editProperties` - not shown in admin panel
2. Database has `DEFAULT CURRENT_TIMESTAMP` - auto-fills when missing
3. Game logic explicitly sets value when creating programmatically
4. Prisma driver skips validation for fields with database defaults

**Important:** With Prisma driver, validation automatically skips required fields that have database defaults, allowing admin panel creates to succeed even when these fields are excluded from the form.
