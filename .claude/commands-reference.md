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
# Build theme styles
reldens buildCss [theme-name]
# Build client HTML
reldens buildClient [theme-name]
# Build both styles and client
reldens buildSkeleton
# Complete rebuild from scratch
reldens fullRebuild

# Theme & asset management
# Install default theme
reldens installDefaultTheme
# Copy assets to dist folder
reldens copyAssetsToDist
# Copy default assets to dist/assets
reldens copyDefaultAssets
# Copy default theme to project
reldens copyDefaultTheme
# Copy reldens module packages to project
reldens copyPackage
# Delete and recreate dist folder
reldens resetDist
# Delete dist folder only
reldens removeDist

# Database & entities
# Generate entities from database schema
reldens generateEntities [--override]
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

**Prisma Workflow (running from the reldens project root):**
1. Copy `.env` from the app folder into the project root if not already present
2. Run `npx reldens-storage-prisma` to generate `prisma/schema.prisma` and `prisma/client/` — introspects the MySQL database and creates the Prisma schema
3. Run `npx reldens-storage generateEntities --driver=prisma` to generate Reldens entities — or use `npx reldens generateEntities --override` to read credentials from `.env` automatically
4. Set `RELDENS_STORAGE_DRIVER=prisma` in your `.env` file to use Prisma at runtime

**Note:** `RELDENS_DB_CLIENT=mysql2` is automatically normalized to `mysql` when `RELDENS_STORAGE_DRIVER=prisma` because Prisma does not support the `mysql2://` URL scheme.

**Environment Variables for Prisma:**
```
RELDENS_STORAGE_DRIVER=prisma
RELDENS_DB_URL=mysql://user:password@host:port/database
```

## Installation & Setup

```bash
# Create base project skeleton
reldens createApp
# Install skeleton
reldens installSkeleton
# Copy .env.dist template
reldens copyEnvFile
# Copy knexfile.js template
reldens copyKnexFile
# Copy index.js template
reldens copyIndex
# Reset dist and run fullRebuild
reldens copyServerFiles
# Copy all default files for fullRebuild
reldens copyNew
# Show all available commands
reldens help
# Test file system access
reldens test
```

## Data Generation Tools

```bash
# Generate game data (via reldens-generate)
# Generate player XP per level
reldens-generate players-experience
# Generate monster XP per level
reldens-generate monsters-experience
# Generate attributes per level
reldens-generate attributes
# Generate maps with various loaders
reldens-generate maps

# Data import (via reldens-import)
# Import game data
reldens-import [data-type]
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
