# Environment Variables Reference

Complete reference for all RELDENS_* environment variables.

See `lib/game/server/install-templates/.env.dist` for the template file.

## Application Server

- `NODE_ENV` - Environment mode (production/development)
- `RELDENS_DEFAULT_ENCODING` - Default encoding (default: utf8)
- `RELDENS_APP_HOST` - Application host (default: `http://localhost`)
- `PORT` - Application port, takes precedence over `RELDENS_APP_PORT` when it is set to a non zero number
- `RELDENS_APP_PORT` - Application port, used when `PORT` is not set (default: 8080)
- `RELDENS_PUBLIC_URL` - Public URL for the application (default: `RELDENS_APP_HOST` plus `:` plus the port)

The port is resolved in `EnvironmentVariablesReader.fetchConfigServerFromEnvironmentVariables()` (`lib/game/server/environment-variables-reader.js`):

```js
let port = Number(process.env.PORT || 0);
if(0 === port){
    port = Number(process.env.RELDENS_APP_PORT || 0);
    if(0 === port){
        port = 8080;
    }
}
```

## HTTPS Configuration

- `RELDENS_EXPRESS_USE_HTTPS` - Enable HTTPS
- `RELDENS_EXPRESS_HTTPS_PRIVATE_KEY` - Private key path
- `RELDENS_EXPRESS_HTTPS_CERT` - Certificate path
- `RELDENS_EXPRESS_HTTPS_CHAIN` - Certificate chain path
- `RELDENS_EXPRESS_HTTPS_PASSPHRASE` - HTTPS passphrase

## Express Server

The following variables are listed (commented out) in `.env.dist` but are not read by `EnvironmentVariablesReader.fetchConfigServerFromEnvironmentVariables()`, they map to `AppServerFactory` config options that must be passed programmatically: `RELDENS_USE_EXPRESS_JSON`, `RELDENS_EXPRESS_JSON_LIMIT`, `RELDENS_EXPRESS_URLENCODED_LIMIT`, `RELDENS_TOO_MANY_REQUESTS_MESSAGE`, `RELDENS_USE_URLENCODED`, `RELDENS_USE_XSS_PROTECTION`, `RELDENS_USE_CORS`, `RELDENS_CORS_METHODS`, `RELDENS_CORS_HEADERS`.

- `RELDENS_USE_EXPRESS_JSON` - Enable JSON parsing
- `RELDENS_EXPRESS_JSON_LIMIT` - JSON payload limit
- `RELDENS_EXPRESS_URLENCODED_LIMIT` - URL encoded limit
- `RELDENS_GLOBAL_RATE_LIMIT` - Global rate limiting switch, 0 or 1 (default: 0). With 1 every Express request is counted per IP using `RELDENS_EXPRESS_RATE_LIMIT_MS` and `RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS`, so raise the maximum when this server also serves the statics.
- `RELDENS_TOO_MANY_REQUESTS_MESSAGE` - Rate limit message
- `RELDENS_USE_URLENCODED` - Enable URL encoding
- `RELDENS_USE_HELMET` - Enable Helmet security
- `RELDENS_USE_XSS_PROTECTION` - Enable XSS protection
- `RELDENS_USE_CORS` - Enable CORS
- `RELDENS_CORS_ORIGIN` - CORS origin (default: `RELDENS_PUBLIC_URL`)
- `RELDENS_CORS_METHODS` - CORS methods
- `RELDENS_CORS_HEADERS` - CORS headers
- `RELDENS_EXPRESS_SERVE_HOME` - Serve dynamic home page, 0 or 1 (default: 0 in code, `.env.dist` sets 1)
- `RELDENS_EXPRESS_TRUSTED_PROXY` - Trusted proxy
- `RELDENS_EXPRESS_RATE_LIMIT_MS` - Rate limit window (default: 60000)
- `RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 30)
- `RELDENS_EXPRESS_RATE_LIMIT_APPLY_KEY_GENERATOR` - Apply key generator
- `RELDENS_EXPRESS_SERVE_STATICS` - Serve the `dist` static files, 0 or 1 (default: 0 in code, `.env.dist` sets 1)

Both are read in `ServerManager.enableServeStaticsAndHomePage()` (`lib/game/server/manager.js`):

```js
async enableServeStaticsAndHomePage()
{
    if(1 === Number(process.env.RELDENS_EXPRESS_SERVE_HOME || 0)){
        await this.appServerFactory.enableServeHome(this.app, async (request) => {
            return await HomepageLoader.loadContents(request.query?.lang, this.themeManager.distPath);
        });
    }
    if(1 === Number(process.env.RELDENS_EXPRESS_SERVE_STATICS || 0)){
        await this.appServerFactory.serveStatics(this.app, this.themeManager.distPath);
    }
}
```

## Security

- `RELDENS_SIGNED_TOKENS_SECRET` - Secret used to sign the reset password links and the multi-server disconnection requests, shared by every server of a multi-server setup (default: `RELDENS_ADMIN_SECRET`)
- `RELDENS_ADMIN_CSRF_ENABLED` - Session based CSRF tokens on the administration router, 0 or 1 (default: 1). The token is sent to the admin client JS in the `reldens-admin-csrf-token` cookie, added to every POST form as `_csrf` and to the fetch requests as the `X-CSRF-Token` header (the tileset analyzer admin JS sends it too, its routes are not exempt); only the maps wizard, the objects importer and the skills importer paths are added to the router `csrfProtection.ignoredPaths`, and their upload routes check the token after their uploader with their own `CsrfProtection` middleware. Projects created before this change must refresh their `theme/admin` templates and JS (`reldens fullRebuild`)
- `RELDENS_ADMIN_LOGIN_WINDOW_MS` - Administration panel login limiter window (default: 900000)
- `RELDENS_ADMIN_LOGIN_MAX_ATTEMPTS` - Failed administration panel logins allowed per IP and email in the window (default: 5)
- `RELDENS_ADMIN_SESSION_MAX_AGE_MS` - Administration panel session cookie and stored session max age, 0 keeps it a browser session cookie and stores it for one day (default: 86400000)
- `RELDENS_ADMIN_SESSION_SAME_SITE` - Administration panel session cookie `SameSite` (default: lax)
- `RELDENS_ADMIN_SESSION_ROLLING` - Slide the administration panel session expiry on every request, 0 or 1 (default: 0)
- `RELDENS_LOGIN_ATTEMPTS_ENABLED` - Failed login attempts lockout on both logins, 0 or 1 (default: 1)
- `RELDENS_LOGIN_ATTEMPTS_MAX` - Failed attempts per identity or address before the block (default: 10)
- `RELDENS_LOGIN_ATTEMPTS_BLOCK_MS` - Block time applied when the attempts limit is reached (default: 900000)
- `RELDENS_GAME_LOGIN_WINDOW_MS` - Game login room joins window (default: 60000)
- `RELDENS_GAME_LOGIN_MAX_JOINS` - Game login room joins allowed per address and per username in the window (default: 20)
- `RELDENS_ROOMS_LOGIN_WINDOW_MS` - Scene and feature rooms joins window (default: 60000)
- `RELDENS_ROOMS_LOGIN_MAX_JOINS` - Scene and feature rooms joins allowed per room type, per address and per username in the window (default: 60)
- `RELDENS_MAX_CONCURRENT_PASSWORD_VALIDATIONS` - Password validations running at the same time, the logins above it are rejected without loading the user (default: 8)
- `RELDENS_REGISTRATION_MAX_PER_IP` - Registrations allowed per address in the attempts window (default: 10)
- `RELDENS_USERNAME_MINIMUM_LENGTH` - Minimum registration username length (default: 3)
- `RELDENS_USERNAME_MAXIMUM_LENGTH` - Maximum registration username length, the username only accepts letters, numbers, `_`, `.` and `-` (default: 50)
- `RELDENS_EMAIL_MAXIMUM_LENGTH` - Maximum registration email length (default: 255)
- `RELDENS_GUESTS_MAX_PER_IP` - Guest accounts allowed per address in the attempts window (default: 20)
- `RELDENS_PASSWORD_MINIMUM_LENGTH` - Minimum password length for the registration, the password reset, `createAdmin` and `resetPassword` (default: 3), read into `server/security/passwordMinimumLength`; `PasswordPolicy.fetchMinimumLength()` (`lib/users/password-policy.js`) uses it only when the `client/players/password/minimumLength` row (3 in the basic configuration) is missing
- `RELDENS_PASSWORD_MAXIMUM_LENGTH` - Maximum password length for the registration and the password reset (default: 128)
- `RELDENS_VALIDATE_ROOMS_ORIGIN` - Validate the `Origin` header on every room join, 0 or 1 (default: 0)
- `RELDENS_ALLOW_REQUESTS_WITHOUT_ORIGIN` - Accept joins without an `Origin` header, needed by the Node clients, 0 or 1 (default: 1)
- `RELDENS_GUESTS_CLEANUP_ENABLED` - Remove the stale guest accounts on an interval, 0 or 1 (default: 0)
- `RELDENS_GUESTS_CLEANUP_AFTER_MS` - Time without activity before a guest account is removed (default: 604800000)
- `RELDENS_GUESTS_CLEANUP_INTERVAL_MS` - Interval between the guests cleanup runs (default: 3600000)
- `RELDENS_IP_LISTS_ENABLED` - Address allow and deny lists, 0 or 1 (default: 0)
- `RELDENS_IP_ALLOW_LIST` - Comma separated addresses or CIDR ranges; with entries here only those addresses are accepted and the deny list is ignored
- `RELDENS_IP_DENY_LIST` - Comma separated addresses or CIDR ranges rejected on the Express routes and on the WebSocket upgrade

The basic configuration (`migrations/production/reldens-basic-config-v4.0.0.sql`) installs a `server/security/*` row for the admin CSRF, admin login (window and max attempts), admin session (max age and same site), game login, rooms login, guests, registration (max per IP, username minimum and maximum length, email maximum length), login attempts, max concurrent password validations, password maximum length and address lists settings; the admin session rolling, the guests cleanup and the password minimum length have no `server/security/*` row (the password minimum length row is `client/players/password/minimumLength`). `ServerManager` passes the values read by `EnvironmentVariablesReader.fetchConfigServerFromEnvironmentVariables()` to the `ConfigManager` constructor as the initial `server` configuration (`environmentConfig`, created again when the installer writes the `.env`, for example `server/security/*`, `server/rooms/validateRoomsOriginRequest`, `server/rooms/allowRequestsWithoutOrigin`, `server/mailer/forgotPasswordLimit`, `server/firebase/*`, `server/admin/secret` and `server/appServerConfig/*`) before the configuration rows are loaded, and every row overrides the same path, so when a row exists its value wins over the environment variable; the address lists rows are joined with the environment lists in `IpListsUpgradeGuard.refresh()` (`lib/game/server/ip-lists-upgrade-guard.js`, called from `ServerManager.initializeConfigManager()`). See `.claude/ip-lists-and-login-blocks.md` for the lists and the login blocks flow.

## Admin Panel

- `RELDENS_ADMIN_ROUTE_PATH` - Admin panel route path
- `RELDENS_ADMIN_SECRET` - Admin authentication secret, the administration panel is not activated when it is empty
- `RELDENS_SIGNED_TOKENS_SECRET` - Secret used to sign the expiring reset password links and the multi-server disconnect user requests (default: `RELDENS_ADMIN_SECRET`). Every server in a multi-server setup must use the same value
- `RELDENS_HOT_PLUG` - Enable hot-plug configuration updates (0/1, default: 1), read in `ServerManager.initializeConfiguration()` as `1 === Number(process.env.RELDENS_HOT_PLUG || 1)`
- `RELDENS_BLOCKED_ADMIN` - Demo switch read only by the project `index.js` created from `theme/index.js.dist`: with `1` it listens to `reldens.afterCreateAdminManager` and blacklists the save and delete routes of every admin entity for the roles 1, 2 and 99, and denies the game login to the users with role 4; any other value (or unset) leaves the administration panel writable

## Installer

- `RELDENS_INSTALLATION_TYPE` - Packages installation mode used by the installer: `normal` (default, installs `reldens` from npm), `link` (links `reldens` and the `@reldens/*` packages listed in `PackagesInstallation.linkablePackages`, `lib/game/server/installer/packages-installation.js`), `link-main` (installs those `@reldens/*` packages and links `reldens`); see `.claude/installer-guide.md` for the exact list
- `RELDENS_DEBUG_QUERIES` - Enable the storage driver queries debug during the installation (0/1)

## Colyseus Monitor

- `RELDENS_MONITOR` - Enable Colyseus monitor
- `RELDENS_MONITOR_AUTH` - Enable monitor authentication
- `RELDENS_MONITOR_USER` - Monitor username
- `RELDENS_MONITOR_PASS` - Monitor password

## Storage & Database

- `RELDENS_STORAGE_DRIVER` - Storage driver: `knex` (default, bundled with `@reldens/storage`), or one of the optional drivers when its packages are installed in the project: `kysely`, `drizzle`, `objection-js`, `mikro-orm`, `prisma`
- `RELDENS_DB_CLIENT` - Database client (`mysql2` by default, `mysql`, `mongodb` for MikroORM)
- `RELDENS_PRISMA_ADAPTER` - Prisma driver adapter package (default: `@prisma/adapter-mariadb`, Prisma driver only)
- `RELDENS_PRISMA_ADAPTER_CLASS` - Class exported by the Prisma adapter package (default: `PrismaMariaDb`, Prisma driver only)
- `RELDENS_DB_HOST` - Database host
- `RELDENS_DB_PORT` - Database port
- `RELDENS_DB_NAME` - Database name
- `RELDENS_DB_USER` - Database username
- `RELDENS_DB_PASSWORD` - Database password
- `RELDENS_DB_POOL_MIN` - Connection pool minimum (default: 2)
- `RELDENS_DB_POOL_MAX` - Connection pool maximum (default: 10)
- `RELDENS_DB_LIMIT` - Query limit (default: 0)
- `RELDENS_DB_URL` - Full database URL (auto-generated if not specified)
- `RELDENS_DB_URL_OPTIONS` - Additional URL options

## Logging

- `RELDENS_LOG_LEVEL` - Log level (0 = none, 1 = emergency, 2 = alert, 3 = critical, 4 = error, 5 = warning, 6 = notice, 7 = info, 8 = debug). The `@reldens/utils` `Logger` uses 0 (no logs) when it is not set; `.env.dist` sets 7, and the `reldens` CLI (`Commander.prepareCommand()` in `bin/commander.js`) sets 7 when the variable is missing
- `RELDENS_ENABLE_TRACE_FOR` - Enable trace for specific levels (emergency,alert,critical)

## Mailer

All the mailer variables are read once by `EnvironmentVariablesReader.fetchMailerFromEnvironmentVariables()` into `server/mailer` and passed to the `Mailer` constructor.

- `RELDENS_MAILER_ENABLE` - Enable email functionality
- `RELDENS_MAILER_SERVICE` - Mail service provider: `nodemailer` (installed with Reldens) or `sendgrid` (requires `npm install @sendgrid/mail` in the project); the package is loaded from the project `node_modules` through the `@reldens/server-utils` `PackageResolver`, a missing package logs the install command and leaves the mailer disabled
- `RELDENS_MAILER_HOST` - SMTP host
- `RELDENS_MAILER_PORT` - SMTP port
- `RELDENS_MAILER_SECURE` - Use SSL for the SMTP connection (default: 1)
- `RELDENS_MAILER_USER` - SMTP username
- `RELDENS_MAILER_PASS` - SMTP password
- `RELDENS_MAILER_FROM` - From email address
- `RELDENS_MAILER_FORGOT_PASSWORD_LIMIT` - Hours between two reset password emails for the same user (default: 4), read into `server/mailer/forgotPasswordLimit`

## Bundler

- `RELDENS_ALLOW_RUN_BUNDLER` - Allow automatic bundler execution via createClientBundle() (default: 0 in code, `.env.dist` sets 1)
- `RELDENS_ALLOW_BUILD_CLIENT` - Allow client build execution via buildClient() (default: 1)
- `RELDENS_ALLOW_BUILD_CSS` - Allow CSS build execution via buildCss() (default: 1)
- `RELDENS_FORCE_RESET_DIST_ON_BUNDLE` - Force reset dist on bundle
- `RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE` - Force copy assets on bundle
- `RELDENS_JS_SOURCEMAPS` - Enable JavaScript source maps
- `RELDENS_CSS_SOURCEMAPS` - Enable CSS source maps
- `RELDENS_CREATE_CONFIG_FILE` - On startup, write the project theme `config.js` (`HomepageLoader.createConfigFile()`) and run `createClientBundle()`, 0 or 1 (default: 1). With 0 neither runs, so the bundler does not run on startup even with `RELDENS_ALLOW_RUN_BUNDLER=1`. Read in `ServerManager.startGameServerInstance()`:

```js
if(1 === Number(process.env.RELDENS_CREATE_CONFIG_FILE || 1)){
    let populatedConfigFile = HomepageLoader.createConfigFile(
        this.themeManager.projectThemePath,
        Object.assign({}, this.configManager.gameEngine, {client: this.configManager.client})
    );
    if(!populatedConfigFile){
        Logger.error('Failed to create config file for homepage.');
    }
    await this.themeManager.createClientBundle();
}
```

**Important**: Always use `createClientBundle()` instead of calling `buildClient()` directly when building during server startup. The `createClientBundle()` method respects `RELDENS_ALLOW_RUN_BUNDLER` and provides additional configuration options.

## Game Server

- `RELDENS_PING_INTERVAL` - Ping interval in ms (default: 5000)
- `RELDENS_PING_MAX_RETRIES` - Max ping retries (default: 3)
- `RELDENS_ENCODER_BUFFER_KB` - Initial size in KB of the room state encoder buffer (`@colyseus/schema` `Encoder.BUFFER_SIZE`, default: 64); a room state larger than the buffer is still sent (the buffer grows) but logs the "buffer overflow" warning once per room instance
- `RELDENS_GUESTS_EMAIL_DOMAIN` - Email domain of the guest accounts (default: `@guest-reldens.com`), read in `ServerManager.initializeConfiguration()`. A non empty `server/players/guestsUser/emailDomain` config row wins over it; when the row is missing or empty `ServerConfigEnricher.enrichGuestsEmailDomain()` (`lib/game/server/server-config-enricher.js`) stores the environment value in that config path

## Firebase

- `RELDENS_FIREBASE_ENABLE` - Enable Firebase authentication
- `RELDENS_FIREBASE_API_KEY` - Firebase API key
- `RELDENS_FIREBASE_APP_ID` - Firebase app ID
- `RELDENS_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `RELDENS_FIREBASE_DATABASE_URL` - Firebase database URL
- `RELDENS_FIREBASE_PROJECT_ID` - Firebase project ID
- `RELDENS_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `RELDENS_FIREBASE_MESSAGING_SENDER_ID` - Firebase sender ID
- `RELDENS_FIREBASE_MEASUREMENTID` - Firebase measurement ID

## Tileset Analyzer

Read by `EnvironmentVariablesReader.fetchTilesetAnalyzerFromEnvironmentVariables()` into the `server/tilesetAnalyzer` configuration, used by `TilesetAnalyzerSubscriber` (`lib/admin/server/subscribers/tileset-analyzer-subscriber.js`) for the admin `/tileset-analyzer` page and the `@reldens/tileset-to-tilemap` `Requirements` and `TilesetAnalyzerServer`. The flags and the API keys come first, then the `requirements` values (used to detect the available AI providers) and the `analyzer` values (passed to `TilesetAnalyzerServer`). The string values are read with `EnvVar.string()`, so a variable set to an empty value (as `.env.dist` writes the model names) is passed as an empty string, the default only applies when the variable is not set.

- `RELDENS_TILESET_SKIP_AI` - `skipAi`, 0 or 1 (default: 0 in code, `.env.dist` sets 1)
- `RELDENS_TILESET_SHOW_AI_CONTROLS` - `showAiControls`, shows the AI controls on the admin page, 0 or 1 (default: 0 in code, `.env.dist` sets 1)
- `ANTHROPIC_API_KEY` - `requirements.anthropicApiKey`, enables the Claude provider when set (default: not set)
- `GEMINI_API_KEY` - `requirements.geminiApiKey`, enables the Gemini provider when set (default: not set)
- `RELDENS_TILESET_OLLAMA_HOST` - `requirements.ollamaHost` and `analyzer.ollamaHost` (default: empty)
- `RELDENS_TILESET_OLLAMA_MODEL` - `requirements.ollamaModel` (default: `qwen2.5vl:7b`)
- `RELDENS_TILESET_OLLAMA_AVAILABLE_MODELS` - `requirements.ollamaAvailableModels`, comma separated (default: empty)
- `RELDENS_TILESET_CLAUDE_MODEL` - `analyzer.claudeModel` (default: `claude-sonnet-4-6`)
- `RELDENS_TILESET_CLAUDE_MAX_TOKENS` - `analyzer.claudeMaxTokens` (default: 512)
- `RELDENS_TILESET_CLAUDE_MAX_TOKENS_DETECTION` - `analyzer.claudeMaxTokensDetection` (default: 4096)
- `RELDENS_TILESET_GEMINI_MODEL` - `analyzer.geminiModel` (default: `gemini-2.0-flash-preview-image-generation`)
- `RELDENS_TILESET_GEMINI_MAX_TOKENS` - `analyzer.geminiMaxTokens` (default: 512)
- `RELDENS_TILESET_GEMINI_MAX_TOKENS_DETECTION` - `analyzer.geminiMaxTokensDetection` (default: 4096)
- `RELDENS_TILESET_OLLAMA_NUM_CTX` - `analyzer.ollamaNumCtx` (default: 8192)
- `RELDENS_TILESET_OLLAMA_NUM_PREDICT` - `analyzer.ollamaNumPredict` (default: 2000)
- `RELDENS_TILESET_MIN_CLUSTER_TILES` - `analyzer.minClusterTiles` (default: 1)
- `RELDENS_TILESET_MAX_CLUSTER_TILES` - `analyzer.maxClusterTiles` (default: 30)
- `RELDENS_TILESET_CLUSTER_COLOR_DISTANCE` - `analyzer.clusterColorDistance` (default: 30)
- `RELDENS_TILESET_CLUSTER_VARIANCE_THRESHOLD` - `analyzer.clusterVarianceThreshold` (default: 600)
- `RELDENS_TILESET_CLUSTER_MIN_TILE_FILL_PCT` - `analyzer.clusterMinTileFillPct` (default: 10)
- `RELDENS_TILESET_CLUSTER_SPLIT_BY_GAP` - `analyzer.clusterSplitByGap` (default: 1)
- `RELDENS_TILESET_ELEMENT_BORDER_COLOR_DISTANCE` - `analyzer.elementBorderColorDistance` (default: 20)
- `RELDENS_TILESET_VALIDATE_PASS` - `analyzer.validatePass`, 0 or 1 (default: 0)
