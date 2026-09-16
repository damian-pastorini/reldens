# Installer Guide

Complete guide for the Reldens web-based installation wizard.

## Overview

The Reldens installer (`lib/game/server/installer.js`) provides a web-based GUI for setting up new Reldens installations. It handles database setup, entity generation, storage driver configuration, and project file creation.

## Accessing the Installer

The installer runs automatically on the first launch when no installation lock file exists:
```bash
npm start
# Navigate to http://localhost:8080 (or configured host/port)
```

The installer will automatically redirect to the installation wizard if the project has not been installed yet.

## Storage Drivers & Database Clients

Knex is the default storage driver and the only one bundled with `@reldens/storage`. The installer lists the optional drivers only when their packages resolve from the project `node_modules` (`StorageDriversResolver.available()` from `@reldens/cms`), so install the packages before opening the wizard:

- `knex` (default, always available) - MySQL (native) / MySQL2 (recommended, automated installation), plus the manual clients pg, sqlite3, better-sqlite3, mssql, oracledb, cockroachdb
- `kysely` - `npm install kysely` - MySQL / MySQL2 (automated installation)
- `drizzle` - `npm install drizzle-orm` - MySQL / MySQL2 (automated installation)
- `objection-js` - `npm install objection@3.1.5` - same clients as Knex
- `mikro-orm` - `npm install @mikro-orm/core @mikro-orm/mysql` (plus `@mikro-orm/mongodb` when the client is MongoDB) - MySQL (automated installation), plus the manual clients mariadb, postgresql, sqlite, mongodb, mssql, better-sqlite3
- `prisma` - `npm install prisma @prisma/client @prisma/adapter-mariadb` - MySQL (automated installation), plus the manual clients postgresql, sqlite, sqlserver, mongodb, cockroachdb

The client list per driver lives in `install/index.js` (`DB_CLIENTS_MAP`). The default client is `mysql2` for the Knex based drivers and `mysql` for MikroORM and Prisma.

## Automated vs Manual Installation

### Automated Installation (MySQL Only)

Only MySQL clients (`mysql`, `mysql2`) support the automated installation scripts:

1. Creates database tables via `reldens-install-v4.0.0.sql`
2. Installs basic configuration via `reldens-basic-config-v4.0.0.sql` (if checked)
3. Installs sample data via `reldens-sample-data-v4.0.0.sql` (if checked)
4. Generates entities from database schema
5. Creates project configuration files

### Manual Installation (All Other Clients)

Clients marked with **(manual)** require manual database setup:

1. Installer skips SQL script execution
2. User must manually create database tables and schema
3. Installer generates entities from existing database
4. Installer creates project configuration files

**Manual Setup Process:**
1. Select a manual client from the installer
2. Complete the installation wizard
3. Manually execute SQL scripts or create schema in your database:
   - Copy SQL files from `migrations/production/` directory
   - Adapt SQL syntax for your database (if needed)
   - Execute scripts in order: install, basic-config, sample-data
4. Run entity generation: `reldens generateEntities --override`
5. Restart the application

## Installation Process Flow

1. **Form validation**
   - The driver key must exist in the `@reldens/storage` `DriversMap` (error `invalid-driver`)

2. **Package Installation** (if enabled)
   - Status: "Checking and installing required packages..."
   - Installs or links `reldens` and the `@reldens/*` packages depending on `RELDENS_INSTALLATION_TYPE`
   - For the Prisma driver also installs `prisma`, `@prisma/client` and the adapter (`RELDENS_PRISMA_ADAPTER`)

3. **Driver availability**
   - The selected driver packages must resolve from the project (error `driver-packages-missing`)
   - The driver modules are loaded and attached to the data server config (`knexModules`, `kyselyModules`, etc.)

4. **Database Connection**
   - Status: "Configuring database connection..."
   - Tests connection with provided credentials

5. **Driver Installation**
   - Status: "Installing database driver: {driver}..."
   - Executes SQL migration scripts through the data server `rawQuery`
   - Creates tables, basic config, sample data (MySQL clients only)

6. **Entity Generation**
   - Status: "Generating entities from database schema..."
   - `EntitiesInstallation` runs the `@reldens/storage` `EntitiesGenerator` on the connected data server
   - Writes `generated-entities/entities/`, `generated-entities/models/{driver}/`, `entities-config.js` and `entities-translations.js`
   - Prisma only: generates `prisma/schema.prisma` and `prisma/client` (`npx prisma db pull`, `npx prisma generate`), writes `prisma.config.js` at the project root, and builds the `prismaModules` used by the generator and the runtime

7. **Project Files**
   - Status: "Creating project files..."
   - Creates `.env`, `.gitignore`, `install.lock`, and `knexfile.js` for the Knex based drivers (`knex`, `objection-js`)
   - Cleans the sample assets when the sample data was not installed

8. **Completion**
   - Status: "Installation completed successfully!"
   - Runs the `startCallback` (the `ServerManager` starts the game server) and redirects to the game

## Status Tracking

The installer provides real-time status updates during installation:
- Status file: `install/install-status.json` inside the project root
- Format: `{message: string, timestamp: number}`
- Frontend polls every 2 seconds
- Status messages appear beside/below loading image

**Status Messages:**
- "Starting installation process..."
- "Checking and installing required packages..."
- "Configuring database connection..."
- "Installing database driver: {driver}..."
- "Generating entities from database schema..."
- "Creating project files..."
- "Installation completed successfully!"

## Configuration Options

### App Settings
- **Host** - Server host URL (e.g., http://localhost)
- **Port** - Server port (default: 8080)
- **Public URL** - Public-facing URL (for reverse proxies)
- **Trusted Proxy** - Reverse proxy address
- **Admin Panel Path** - Admin interface route (default: /reldens-admin)
- **Admin Panel Secret Key** - Secret key for admin access
- **Hot-Plug** - Enable runtime configuration reload

### Storage Settings
- **Storage Driver** - `knex` by default, plus the optional drivers detected in the project
- **Client** - Database client library (see list above)
- **Host** - Database server host
- **Port** - Database server port
- **Database Name** - Database name
- **Username** - Database user
- **Password** - Database password
- **Install minimal configuration** - MySQL only
- **Install sample data** - MySQL only

The form defaults are read from the environment when present: `RELDENS_APP_HOST`, `RELDENS_APP_PORT`, `RELDENS_PUBLIC_URL`, `RELDENS_EXPRESS_TRUSTED_PROXY`, `RELDENS_ADMIN_ROUTE_PATH`, `RELDENS_HOT_PLUG`, `RELDENS_STORAGE_DRIVER`, `RELDENS_DB_CLIENT`, `RELDENS_DB_HOST`, `RELDENS_DB_PORT`, `RELDENS_DB_NAME`.

### Optional Features
- **HTTPS** - SSL/TLS configuration
- **Monitor** - Colyseus monitoring tools
- **Mailer** - Email service integration (SendGrid, NodeMailer)
- **Firebase** - Firebase authentication integration

## Installer Architecture

### Core Classes

**Installer** (`lib/game/server/installer.js`)
- Main orchestration class
- Handles Express routes and form processing
- Renders the storage drivers list with `storageDriversOptions()` (only the available drivers)
- Validates the driver availability (`isStorageDriverAvailable()`) and attaches the driver modules (`appendDriverModules()`)
- Coordinates sub-installers
- Manages status tracking

**GenericDriverInstallation** (`lib/game/server/installer/generic-driver-installation.js`)
- Handles every non-Prisma driver installation (Knex, Kysely, Drizzle, ObjectionJS, MikroORM)
- Executes SQL migrations via `rawQuery()`
- Checks client type and skips non-MySQL scripts

**PrismaInstallation** (`lib/game/server/installer/prisma-installation.js`)
- Handles Prisma-specific installation
- Runs the SQL scripts in a forked subprocess
- Builds the `prismaModules` with `MySQLInstaller.createPrismaClient()` from `@reldens/cms`

**PrismaSubprocessWorker** (`lib/game/server/installer/prisma-subprocess-worker.js`)
- Forked child process for Prisma installation
- Isolates Prisma client to avoid module caching
- Generates the minimal Prisma client, writes `prisma.config.js` and runs the SQL scripts

**EntitiesInstallation** (`lib/game/server/installer/entities-installation.js`)
- Generates entity classes from database schema for every driver
- For Prisma, regenerates the schema and client first (`preparePrismaSchema()`)

**ProjectFilesCreation** (`lib/game/server/installer/project-files-creation.js`)
- Creates `.env` file with configuration
- Creates `knexfile.js` for the Knex based drivers
- Creates `.gitignore` and `install.lock`
- Runs the assets cleanup and the start callback

**PackagesInstallation** (`lib/game/server/installer/packages-installation.js`)
- Manages npm package installation and linking based on `RELDENS_INSTALLATION_TYPE`
- Runs installs before links so the main package link is always restored last
- Handles the Prisma packages (`prisma`, `@prisma/client` and the adapter)

**Installation Types** (set via `RELDENS_INSTALLATION_TYPE` environment variable):

- `normal` - installs `reldens` from npm registry; no linking
- `link` - npm links `reldens` and all `@reldens/*` packages; no npm installs
- `link-main` - npm installs all `@reldens/*` packages from registry, then npm links `reldens` last to restore the local source junction

### Frontend Files

**install/index.html**
- Installation form with all configuration fields
- Storage driver select rendered from the `storageDrivers` template list
- Client dropdown populated by JavaScript
- Form validation and submission

**install/index.js**
- Database client mapping (`DB_CLIENTS_MAP`)
- Dynamic client dropdown updates
- Status polling functionality
- Form submission handling

**install/css/styles.scss**
- Installer styling

## Runtime Storage Initialization

After the installation (and on every start) `DataServerInitializer.initializeEntitiesAndDriver()` (`lib/game/server/data-server-initializer.js`) resolves the driver modules for `RELDENS_STORAGE_DRIVER` with the `@reldens/cms` `StorageDriversResolver`, builds the Prisma modules from `prisma/client` and the adapter when needed, and instantiates the data server from the `@reldens/storage` `DriversMap`.

## MySQL-Only Scripts

The following SQL migration files only work with MySQL:
- `migrations/production/reldens-install-v4.0.0.sql`
- `migrations/production/reldens-basic-config-v4.0.0.sql`
- `migrations/production/reldens-sample-data-v4.0.0.sql`

For other databases, these scripts must be manually adapted to the target database syntax.

## Tests

`tests/test-installation-process.js` covers the installation process without a browser:

- the installer defaults to the Knex driver and lists only the available drivers
- the entities loader resolves the generated Knex models
- an unknown driver is rejected before any project file is written
- a full Knex installation against the tests database creates `.env`, `.gitignore`, `knexfile.js`, `install.lock` and the generated Knex models in `test-results/installer-project`

It runs with the other integration tests (`npm test` or `npm run test:default`) using the database from `tests/config.json`; the install SQL only creates the missing tables and the seeds are not executed, so the tests database data is not modified.

## Troubleshooting

### "The selected storage driver packages were not found in the project"

**Cause:** The driver was selected but its packages are not installed in the project `node_modules`

**Solution:**
1. Install the packages listed in the Storage Drivers section
2. Reload the installer page, the driver is listed once the packages resolve

### "Non-MySQL client detected, skipping automated SQL scripts"

**Cause:** Selected a manual database client (PostgreSQL, SQLite, MongoDB, etc.)

**Solution:**
1. Complete the installer wizard
2. Manually set up database schema
3. Run entity generation
4. Restart application

### "Connection failed, please check the storage configuration"

**Cause:** Invalid database credentials or unreachable database server

**Solution:**
1. Verify database server is running
2. Check host, port, username, password
3. Ensure database exists
4. Check firewall/network settings

### "Entities generation failed"

**Cause:** Database schema not found or invalid

**Solution:**
1. For MySQL: Ensure installation scripts ran successfully
2. For manual clients: Verify you created all required tables
3. Check database connection
4. Ensure user has schema read permissions

### "Required packages installation failed"

**Cause:** npm install failed or network issues

**Solution:**
1. Check internet connection
2. Manually run: `npm install reldens`
3. For Prisma: `npm install prisma @prisma/client @prisma/adapter-mariadb`
4. Check npm logs for errors

## Post-Installation

After successful installation:
1. Application redirects to game
2. Lock file created at the project root (`install.lock`)
3. Installer becomes inaccessible
4. Use admin panel for further configuration
5. Access admin at configured path (default: /reldens-admin)
6. Use configured admin secret key for first login

## Re-installation

To re-run the installer:
1. Stop the application
2. Delete the installation lock file (`install.lock` in the project root)
3. Optionally drop and recreate database
4. Start application and navigate to installation wizard
