# IP Lists And Login Blocks

How the address allow and deny lists are built and checked, and how the failed logins turn into temporary address blocks stored in the same `ip_lists` table.

## Lists Sources

- Environment: `RELDENS_IP_LISTS_ENABLED` (0 or 1), `RELDENS_IP_ALLOW_LIST` and `RELDENS_IP_DENY_LIST` (comma separated addresses or CIDR ranges), read by `EnvironmentVariablesReader.fetchIpListsFromEnvironmentVariables()` into `configServer.appServerConfig.ipLists`.
- `config` rows (scope `server`): `security/ipLists/enabled` (boolean, overrides the environment switch), `security/ipLists/allow` and `security/ipLists/deny` (comma separated, appended to the environment entries).
- `ip_lists` table rows without `expires_at`: permanent entries, `list_type` is `allow` or `deny`, the `address` and `list_type` pair is unique. They are managed in the administration panel settings menu as "IP Allow And Deny Lists" (entity `ipLists`).

## Startup Flow

1. `ServerManager.createAppServer()` calls `AppServerFactory.createAppServer(appServerConfig)`, `setupIpLists()` pushes the environment lists into the `IpListsConfigurer` and registers its Express middleware before the security, CORS, rate limit and body parsing middlewares.
2. `ServerManager.initializeConfigManager()` loads the `config` rows and calls `ServerManagersInitializer.refreshIpLists()`, which rebuilds the lists: the enabled flag comes from the `config` row with the environment value as default, and each list joins the environment entries, the `config` row entries and the permanent `ip_lists` rows (`loadStoredIpLists()` skips the rows with `expires_at`).
3. The Colyseus transport receives `beforeUpgrade: ServerManagersInitializer.createBeforeUpgradeHandler(serverManager)`.
4. `ServerManagersInitializer.initializeManagers()` calls `loginManager.loginAttempts.restoreAddressBlocks(Date.now())` right after the `LoginManager` is created, see the login blocks section.

The lists are only built on the startup, a change in the `ip_lists` rows or in the `security/ipLists/*` rows is applied after a restart.

## Where The Lists Are Checked

- Express routes: the middleware answers `403` with `Forbidden.` for a not allowed `req.ip`. Behind a reverse proxy `RELDENS_EXPRESS_TRUSTED_PROXY` sets the Express `trust proxy` setting so `req.ip` is the client address.
- Colyseus matchmaking: the `/matchmake/*` requests are answered by the Colyseus router before the request reaches Express (`@colyseus/core` `router/index.cjs` only hands the other routes to the Express app), so the seat reservation is not checked by the lists.
- WebSocket upgrade: the `beforeUpgrade` handler returns `403` and logs `Denied WebSocket upgrade for address: <address>`, so a denied address can not join any room, also from a page that was loaded before the address was denied. The browser error of a refused upgrade carries no message, so `GameClient.joinOrCreate()` stores `GameConst.JOIN_GAME_ERROR_MESSAGE` and the login form shows it.

## Matching Rules

`IpListsConfigurer.isAllowed(address)` from `@reldens/server-utils`:

- Disabled lists allow every address.
- IPv4 mapped IPv6 addresses (`::ffff:127.0.0.1`) are compared as IPv4, a value that is not an IP address is allowed.
- When the allow list has entries only those addresses are accepted and the deny list is ignored.
- Without allow entries the addresses in the deny list are rejected.
- Entries are single addresses or CIDR ranges, matched with the Node `net.BlockList`.

## Login Blocks

`LoginAttempts` (`lib/game/server/memory/login-attempts.js`) is created by the `LoginManager` with the merged `securityConfig.loginAttempts` settings and the `ipLists` repository, and it is shared by the game login and the administration panel login.

1. Every failed login calls `LoginManager.registerLoginFailure()`, which registers a hit for `identity:<username or email>` and for `address:<request address>` (`GameConst.LOGIN_ATTEMPTS_KEYS`).
2. When a key reaches `maxAttempts` inside the window (`RELDENS_LOGIN_ATTEMPTS_MAX` or `security/loginAttempts/maxAttempts`, the window defaults to the block time) the key is blocked for `blockTimeMs` (`RELDENS_LOGIN_ATTEMPTS_BLOCK_MS` or `security/loginAttempts/blockTimeMs`).
3. An address block is stored as a `deny` row with the reason `Login attempts limit reached.` and the `expires_at` of the block. A repeated block for the same address updates that row, and a permanent `deny` row (without `expires_at`) is never replaced. The identity blocks are kept in memory only.
4. `LoginManager.isLoginBlocked()` rejects the login while the identity or the address is blocked, in `processUserRequest()` for the game login and in `roleAuthenticationCallback()` for the administration panel login, with the same invalid login message as a wrong password.
5. On the startup `restoreAddressBlocks()` loads the `deny` rows whose `expires_at` is still in the future back into memory, so a restart does not lift the block. The expired rows stay in the table and are ignored.

The temporary rows never enter the Express or WebSocket lists, they only block the logins.

## Other Counters Per Address

The same `LoginAttempts` registry counts, in memory only:

- `joins:` - game login room joins per address in `RoomLogin.isJoinsLimitReached()` (`RELDENS_GAME_LOGIN_MAX_JOINS` in `RELDENS_GAME_LOGIN_WINDOW_MS`).
- `guests:` - guest accounts created per address (`RELDENS_GUESTS_MAX_PER_IP`).
- `registration:` - accounts registered per address (`RELDENS_REGISTRATION_MAX_PER_IP`).
- `forgotAddress:` - forgot password requests per address, with the registration maximum.

## Administration Panel Login Limiter

Independent from the lists: `CreateAdminSubscriber.applyLoginRateLimit()` mounts an `express-rate-limit` limiter on the administration login POST, keyed by the address and the submitted email, where only the failed logins count (`RELDENS_ADMIN_LOGIN_MAX_ATTEMPTS` in `RELDENS_ADMIN_LOGIN_WINDOW_MS`) and the next request gets `429`. In development mode (`NODE_ENV` is `development`, `dev` or `test`, or the domain of a plain `http://` `RELDENS_APP_HOST` or `RELDENS_PUBLIC_URL` matches a development pattern like `localhost`, `127.0.0.1` or `.local`) `RateLimitConfigurer.createLimiter()` multiplies the limit by the `developmentMultiplier` (10), the e2e suite reads the real limit from the `RateLimit` response header.

## Tests

- `tests/test-login-attempts.js` - stored blocks restore, stored block update and the permanent deny row protection.
- `tests/e2e/test-login-security.spec.js` - lockout with the stored block and the simulated restart, the denied address page and room join.
- `tests/e2e/test-admin-security.spec.js` - administration panel login limiter.
- `tests/e2e/helpers/security-state.js` - e2e endpoints that deny addresses for a short time and clear the lists, the stored rows and the login attempts before every test.
