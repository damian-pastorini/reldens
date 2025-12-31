# Environment Variables Reference

Complete reference for all RELDENS_* environment variables.

See `lib/game/server/install-templates/.env.dist` for the template file.

## Application Server

- `NODE_ENV` - Environment mode (production/development)
- `RELDENS_DEFAULT_ENCODING` - Default encoding (default: utf8)
- `RELDENS_APP_HOST` - Application host
- `RELDENS_APP_PORT` - Application port
- `RELDENS_PUBLIC_URL` - Public URL for the application

## HTTPS Configuration

- `RELDENS_EXPRESS_USE_HTTPS` - Enable HTTPS
- `RELDENS_EXPRESS_HTTPS_PRIVATE_KEY` - Private key path
- `RELDENS_EXPRESS_HTTPS_CERT` - Certificate path
- `RELDENS_EXPRESS_HTTPS_CHAIN` - Certificate chain path
- `RELDENS_EXPRESS_HTTPS_PASSPHRASE` - HTTPS passphrase

## Express Server

- `RELDENS_USE_EXPRESS_JSON` - Enable JSON parsing
- `RELDENS_EXPRESS_JSON_LIMIT` - JSON payload limit
- `RELDENS_EXPRESS_URLENCODED_LIMIT` - URL encoded limit
- `RELDENS_GLOBAL_RATE_LIMIT` - Global rate limiting
- `RELDENS_TOO_MANY_REQUESTS_MESSAGE` - Rate limit message
- `RELDENS_USE_URLENCODED` - Enable URL encoding
- `RELDENS_USE_HELMET` - Enable Helmet security
- `RELDENS_USE_XSS_PROTECTION` - Enable XSS protection
- `RELDENS_USE_CORS` - Enable CORS
- `RELDENS_CORS_ORIGIN` - CORS origin
- `RELDENS_CORS_METHODS` - CORS methods
- `RELDENS_CORS_HEADERS` - CORS headers
- `RELDENS_EXPRESS_SERVE_HOME` - Serve dynamic home page
- `RELDENS_EXPRESS_TRUSTED_PROXY` - Trusted proxy
- `RELDENS_EXPRESS_RATE_LIMIT_MS` - Rate limit window (default: 60000)
- `RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 30)
- `RELDENS_EXPRESS_RATE_LIMIT_APPLY_KEY_GENERATOR` - Apply key generator
- `RELDENS_EXPRESS_SERVE_STATICS` - Serve static files

## Admin Panel

- `RELDENS_ADMIN_ROUTE_PATH` - Admin panel route path
- `RELDENS_ADMIN_SECRET` - Admin authentication secret
- `RELDENS_HOT_PLUG` - Enable hot-plug configuration updates (0/1)

## Colyseus Monitor

- `RELDENS_MONITOR` - Enable Colyseus monitor
- `RELDENS_MONITOR_AUTH` - Enable monitor authentication
- `RELDENS_MONITOR_USER` - Monitor username
- `RELDENS_MONITOR_PASS` - Monitor password

## Storage & Database

- `RELDENS_STORAGE_DRIVER` - Storage driver (objection-js, mikro-orm, prisma)
- `RELDENS_DB_CLIENT` - Database client (mysql, mysql2, mongodb)
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

- `RELDENS_LOG_LEVEL` - Log level (0-7, default: 7)
- `RELDENS_ENABLE_TRACE_FOR` - Enable trace for specific levels (emergency,alert,critical)

## Mailer

- `RELDENS_MAILER_ENABLE` - Enable email functionality
- `RELDENS_MAILER_SERVICE` - Mail service provider
- `RELDENS_MAILER_HOST` - SMTP host
- `RELDENS_MAILER_PORT` - SMTP port
- `RELDENS_MAILER_USER` - SMTP username
- `RELDENS_MAILER_PASS` - SMTP password
- `RELDENS_MAILER_FROM` - From email address
- `RELDENS_MAILER_FORGOT_PASSWORD_LIMIT` - Forgot password attempts limit (default: 4)

## Bundler

- `RELDENS_ALLOW_RUN_BUNDLER` - Allow bundler execution (default: 1)
- `RELDENS_FORCE_RESET_DIST_ON_BUNDLE` - Force reset dist on bundle
- `RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE` - Force copy assets on bundle
- `RELDENS_JS_SOURCEMAPS` - Enable JavaScript source maps
- `RELDENS_CSS_SOURCEMAPS` - Enable CSS source maps

## Game Server

- `RELDENS_PING_INTERVAL` - Ping interval in ms (default: 5000)
- `RELDENS_PING_MAX_RETRIES` - Max ping retries (default: 3)

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
