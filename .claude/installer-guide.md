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

Reldens supports three storage drivers with multiple database clients:

### Prisma Driver
- **mysql** - MySQL database (automated installation)
- **postgresql (manual)** - PostgreSQL database
- **sqlite (manual)** - SQLite database
- **sqlserver (manual)** - SQL Server database
- **mongodb (manual)** - MongoDB database
- **cockroachdb (manual)** - CockroachDB database

### Objection-js Driver (Knex.js)
- **mysql (native)** - MySQL with native driver (automated installation)
- **mysql2 (recommended)** - MySQL with mysql2 driver (automated installation)
- **pg (manual)** - PostgreSQL
- **sqlite3 (manual)** - SQLite3
- **better-sqlite3 (manual)** - Better-SQLite3
- **mssql (manual)** - SQL Server
- **oracledb (manual)** - Oracle DB
- **cockroachdb (manual)** - CockroachDB

### MikroORM Driver
- **mysql** - MySQL database (automated installation)
- **mariadb (manual)** - MariaDB database
- **postgresql (manual)** - PostgreSQL database
- **sqlite (manual)** - SQLite database
- **mongodb (manual)** - MongoDB database
- **mssql (manual)** - SQL Server
- **better-sqlite3 (manual)** - Better-SQLite3

## Automated vs Manual Installation

### Automated Installation (MySQL Only)

Only MySQL clients support automated installation scripts:
- `mysql` (all drivers)
- `mysql2` (objection-js only)

**Automated steps:**
1. Creates database tables via `reldens-install-v4.0.0.sql`
2. Installs basic configuration via `reldens-basic-config-v4.0.0.sql` (if checked)
3. Installs sample data via `reldens-sample-data-v4.0.0.sql` (if checked)
4. Generates entities from database schema
5. Creates project configuration files

### Manual Installation (All Other Clients)

Clients marked with **(manual)** require manual database setup:
- PostgreSQL, SQLite, MongoDB, SQL Server, Oracle, CockroachDB, MariaDB, Better-SQLite3

**Manual steps:**
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

### For MySQL Clients

1. **Package Installation** (if enabled)
   - Status: "Checking and installing required packages..."
   - Installs `@reldens/storage` and driver-specific packages

2. **Database Connection**
   - Status: "Configuring database connection..."
   - Tests connection with provided credentials

3. **Driver Installation**
   - Status: "Installing database driver: {driver}..."
   - Executes SQL migration scripts
   - Creates tables, basic config, sample data

4. **Entity Generation**
   - Status: "Generating entities from database schema..."
   - Introspects database and generates entity classes

5. **Project Files**
   - Status: "Creating project files..."
   - Creates `.env`, `knexfile.js`, `index.js`, etc.

6. **Completion**
   - Status: "Installation completed successfully!"
   - Redirects to game

### For Manual Clients

1. **Package Installation** (if enabled)
2. **Database Connection**
3. **Driver Installation**
   - Status: "Installing database driver: {driver}..."
   - Logs: "Non-MySQL client detected ({client}), skipping automated SQL scripts."
   - Skips all SQL migrations
4. **Entity Generation** (requires pre-existing database schema)
5. **Project Files**
6. **Completion**

## Status Tracking

The installer provides real-time status updates during installation:
- Status file: `dist/assets/install-status.json`
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
- **Storage Driver** - Database ORM (prisma, objection-js, mikro-orm)
- **Client** - Database client library (see list above)
- **Host** - Database server host
- **Port** - Database server port
- **Database Name** - Database name
- **Username** - Database user
- **Password** - Database password
- **Install minimal configuration** - MySQL only
- **Install sample data** - MySQL only

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
- Coordinates sub-installers
- Manages status tracking

**GenericDriverInstallation** (`lib/game/server/installer/generic-driver-installation.js`)
- Handles ObjectionJS and MikroORM installations
- Executes SQL migrations via `rawQuery()`
- Checks client type and skips non-MySQL scripts

**PrismaInstallation** (`lib/game/server/installer/prisma-installation.js`)
- Handles Prisma-specific installation
- Runs installation in forked subprocess
- Generates Prisma schema and client

**PrismaSubprocessWorker** (`lib/game/server/installer/prisma-subprocess-worker.js`)
- Forked child process for Prisma installation
- Isolates Prisma client to avoid module caching
- Checks client type and skips non-MySQL scripts

**EntitiesInstallation** (`lib/game/server/installer/entities-installation.js`)
- Generates entity classes from database schema
- Supports all three storage drivers

**ProjectFilesCreation** (`lib/game/server/installer/project-files-creation.js`)
- Creates `.env` file with configuration
- Creates `knexfile.js` for ObjectionJS
- Creates `index.js` entry point
- Copies theme files and assets

**PackagesInstallation** (`lib/game/server/installer/packages-installation.js`)
- Manages npm package installation and linking based on `RELDENS_INSTALLATION_TYPE`
- Reads the lock file at construction time (while the main package link is still active)
- Runs installs before links so the main package link is always restored last
- Handles driver-specific dependencies (e.g. `@prisma/client` for Prisma)

**Installation Types** (set via `RELDENS_INSTALLATION_TYPE` environment variable):

- `normal` — installs `reldens` from npm registry; no linking
- `link` — npm links `reldens` and all `@reldens/*` packages; no npm installs
- `link-main` — npm installs all `@reldens/*` packages from registry (no version pinning), then npm links `reldens` last to restore the local source junction

**Package installation sequence** (`link-main`):
1. Lock file is read from `node_modules/reldens/package-lock.json` at construction (while link is active)
2. `unlinkAllPackages()` removes all existing links for `reldens` and all `@reldens/*` packages
3. `checkAndInstallPackages()` runs installs first, then the link:
   - `npm install @reldens/cms`, `npm install @reldens/storage`, etc. (no version pinning)
   - `npm link reldens` — restores the junction to the local source last
4. With the junction restored, `migrations/production/` resolves correctly through the link to the local source SQL files

### Frontend Files

**install/index.html**
- Installation form with all configuration fields
- Client dropdown populated by JavaScript
- Form validation and submission

**install/index.js**
- Database client mapping (`DB_CLIENTS_MAP`)
- Dynamic client dropdown updates
- Status polling functionality
- Form submission handling

**install/css/styles.scss**
- Installer styling

## MySQL-Only Scripts

The following SQL migration files only work with MySQL:
- `migrations/production/reldens-install-v4.0.0.sql`
- `migrations/production/reldens-basic-config-v4.0.0.sql`
- `migrations/production/reldens-sample-data-v4.0.0.sql`

For other databases, these scripts must be manually adapted to the target database syntax.

## Troubleshooting

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
2. Manually run: `npm install @reldens/storage`
3. For Prisma: `npm install @prisma/client`
4. Check npm logs for errors

## Post-Installation

After successful installation:
1. Application redirects to game
2. Lock file created at configured path
3. Installer becomes inaccessible
4. Use admin panel for further configuration
5. Access admin at configured path (default: /reldens-admin)
6. Use configured admin secret key for first login

## Re-installation

To re-run the installer:
1. Stop the application
2. Delete the installation lock file (location configured in ThemeManager)
3. Optionally drop and recreate database
4. Start application and navigate to installation wizard
