# Commands Reference

Complete reference for all Reldens CLI commands.

## CLI Binaries

The project provides three main CLI entry points:
- `reldens` - Main command router (bin/reldens-commands.js)
- `reldens-generate` - Data generation tool (bin/generate.js)
- `reldens-import` - Data import tool (bin/import.js)

## Development & Building

```bash
# Run tests
npm test
# Or with filters
node tests/manager.js --filter="test-name" --break-on-error

# Build commands (via reldens CLI)
reldens buildCss [theme-name]           # Build theme styles
reldens buildClient [theme-name]        # Build client HTML
reldens buildSkeleton                   # Build both styles and client
reldens fullRebuild                     # Complete rebuild from scratch

# Theme & asset management
reldens installDefaultTheme             # Install default theme
reldens copyAssetsToDist                # Copy assets to dist folder
reldens copyDefaultAssets               # Copy default assets to dist/assets
reldens copyDefaultTheme                # Copy default theme to project
reldens copyPackage                     # Copy reldens module packages to project
reldens resetDist                       # Delete and recreate dist folder
reldens removeDist                      # Delete dist folder only

# Database & entities
reldens generateEntities [--override]   # Generate entities from database schema
# This reads .env credentials and uses @reldens/storage to generate entities
# Generated entities are placed in the generated-entities/ directory

# Direct entity generation with connection arguments (bypasses .env):
npx reldens-storage generateEntities --user=reldens --pass=reldens --database=reldens_clean --driver=objection-js
```

## Prisma-Specific Commands

**IMPORTANT:** Prisma requires a separate client generation step before entities can be generated.

```bash
# Step 1: Generate Prisma schema and client from existing database
# This introspects the database and creates prisma/schema.prisma + prisma/client/
npx reldens-storage-prisma --host=localhost --port=3306 --user=reldens --password=reldens --database=reldens_clean --clientOutputPath=./client

# Step 2: Generate Reldens entities using Prisma driver
npx reldens-storage generateEntities --user=reldens --pass=reldens --database=reldens_clean --driver=prisma

# Full parameter list for reldens-storage-prisma:
# --host          Database host (default: localhost)
# --port          Database port (default: 3306)
# --user          Database username (required)
# --password      Database password (required)
# --database      Database name (required)
# --clientOutputPath  Output path for Prisma client (default: ./client)
# --schemaPath    Path for schema.prisma file (default: ./prisma)
```

**Prisma Workflow:**
1. Run `reldens-storage-prisma` to generate schema.prisma and Prisma client
2. The command introspects your MySQL database and creates the Prisma schema
3. Run `reldens-storage generateEntities` with `--driver=prisma` to generate Reldens entities
4. Set `RELDENS_STORAGE_DRIVER=prisma` in your `.env` file to use Prisma at runtime

**Environment Variables for Prisma:**
```
RELDENS_STORAGE_DRIVER=prisma
RELDENS_DB_URL=mysql://user:password@host:port/database
```

## Installation & Setup

```bash
reldens createApp                       # Create base project skeleton
reldens installSkeleton                 # Install skeleton
reldens copyEnvFile                     # Copy .env.dist template
reldens copyKnexFile                    # Copy knexfile.js template
reldens copyIndex                       # Copy index.js template
reldens copyServerFiles                 # Reset dist and run fullRebuild
reldens copyNew                         # Copy all default files for fullRebuild
reldens help                            # Show all available commands
reldens test                            # Test file system access
```

## Data Generation Tools

```bash
# Generate game data (via reldens-generate)
reldens-generate players-experience     # Generate player XP per level
reldens-generate monsters-experience    # Generate monster XP per level
reldens-generate attributes             # Generate attributes per level
reldens-generate maps                   # Generate maps with various loaders

# Data import (via reldens-import)
reldens-import [data-type]              # Import game data
```

## User Management Commands

```bash
# Create admin user
reldens createAdmin --user=username --pass=password --email=email@example.com
# Creates an admin user with role_id from config (default: 1)
# Validates email format and username/email uniqueness
# Password is automatically encrypted using PBKDF2 SHA-512

# Reset user password
reldens resetPassword --user=username --pass=newpassword
# Resets password for existing user
# Password is automatically encrypted
# Works for any user (admin or regular)

# Examples:
reldens createAdmin --user=admin --pass=SecurePass123 --email=admin@yourgame.com
reldens resetPassword --user=someuser --pass=NewSecurePass456
```

**Implementation Details:**
- Service classes: `CreateAdmin` and `ResetPassword` in `lib/users/server/`
- Both receive `serverManager` in constructor (following importer pattern)
- Services return boolean result with `error` property for failure details
- `createAdmin` uses existing `usersRepository.create()` with `role_id` in userData
- `resetPassword` uses `usersRepository.loadOneBy()` and `updateById()`
- Admin role ID from config: `server/admin/roleId` (default: 1)
- Email validation via `sc.validateInput(email, 'email')` from `@reldens/utils`
- Commands initialize ServerManager automatically from `.env` (pattern from `bin/import.js`)
- Password encryption uses `Encryptor` from `@reldens/server-utils` (100k iterations, SHA-512)
