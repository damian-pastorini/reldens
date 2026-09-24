# IP Lists And Login Blocks

How the address allow and deny lists are built and checked, and how the failed logins turn into temporary address blocks stored in the same `ip_lists` table.

## Lists Sources

- Environment: `RELDENS_IP_LISTS_ENABLED` (0 or 1), `RELDENS_IP_ALLOW_LIST` and `RELDENS_IP_DENY_LIST` (comma separated addresses or CIDR ranges), read by `EnvironmentVariablesReader.fetchIpListsFromEnvironmentVariables()` into the `server/appServerConfig/ipLists` configuration (the `environmentConfig` passed to the `ConfigManager` constructor).
- `config` rows (scope `server`): `security/ipLists/enabled` (boolean, overrides the environment switch), `security/ipLists/allow` and `security/ipLists/deny` (comma separated, appended to the environment entries).
- `ip_lists` table rows without `expires_at`: permanent entries, `list_type` is `allow` or `deny`, the `address` and `list_type` pair is unique. They are managed in the administration panel settings menu as "IP Allow And Deny Lists" (entity `ipLists`).

## Startup Flow

1. `ServerManager.createAppServer()` calls `AppServerFactory.createAppServer(appServerConfig)`, `setupIpLists()` pushes the environment lists into the `IpListsConfigurer` and registers its Express middleware before the security, CORS, rate limit and body parsing middlewares.
2. `ServerManager.initializeConfigManager()` loads the `config` rows, creates the `IpListsUpgradeGuard` (`lib/game/server/ip-lists-upgrade-guard.js`, kept as `serverManager.ipListsUpgradeGuard`) and calls its `refresh()`, which rebuilds the lists: the enabled flag comes from the `config` row with the environment value as default, and each list joins the environment entries, the `config` row entries and the permanent `ip_lists` rows (`loadStoredEntries()` skips the rows with `expires_at`).
3. The Colyseus transport receives `beforeUpgrade: serverManager.ipListsUpgradeGuard.createBeforeUpgradeHandler()`.
4. `ServerManagersInitializer.initializeLoginManager()` calls `loginManager.loginAttempts.restoreAddressBlocks(Date.now())` right after the `LoginManager` is created, see the login blocks section.

5. After `gameServer.listen()` the `ServerManager` calls `appServerFactory.attachClientAddressGuard(gameServer.transport.server)`, see the client address section.

The `ip_lists` rows saved or deleted in the administration panel refresh the lists immediately: `IpListsEntitySubscriber` (`lib/admin/server/subscribers/ip-lists-entity-subscriber.js`) runs `ipListsUpgradeGuard.refresh()` on `reldens.adminAfterEntitySave` and `reldens.adminAfterEntityDelete` for the `ipLists` entity. Only the `security/ipLists/*` config rows and the environment values need a restart.

## Client Address

The `ClientAddressGuard` of `@reldens/server-utils` resolves the client address with `proxy-addr` and the Express `trust proxy` function: the socket peer address, or the forwarded address only when the peer is a trusted proxy (`RELDENS_EXPRESS_TRUSTED_PROXY`). On every WebSocket upgrade and every `/matchmake/*` request it removes the client sent `X-Real-IP`, `X-Forwarded-For` and `X-Client-IP` headers and sets `X-Real-IP` to the resolved address, so the Colyseus auth context `ip` (used by the upgrade guard and every per address limit) can not be spoofed.

## Where The Lists Are Checked

- Express routes: the middleware answers `403` with `Forbidden.` for a not allowed `req.ip`. Behind a reverse proxy `RELDENS_EXPRESS_TRUSTED_PROXY` sets the Express `trust proxy` setting so `req.ip` is the client address.
- Colyseus matchmaking: the `/matchmake/*` requests are answered by the Colyseus router before the request reaches Express (`@colyseus/core` `router/index.cjs` only hands the other routes to the Express app), so the `ClientAddressGuard` checks them before the Colyseus listener and answers `403` for a not allowed address.
- WebSocket upgrade: the `beforeUpgrade` handler returns `403` and logs `Denied WebSocket upgrade for address: <address>`, so a denied address can not join any room, also from a page that was loaded before the address was denied. The browser error of a refused upgrade carries no message, so `GameClient.joinOrCreate()` stores `GameConst.JOIN_GAME_ERROR_MESSAGE` and the login form shows it.

## Matching Rules

`IpListsConfigurer.isAllowed(address)` from `@reldens/server-utils`:

- Disabled lists allow every address.
- IPv4 mapped IPv6 addresses (`::ffff:127.0.0.1`) are compared as IPv4, a value that is not an IP address is allowed only when the allow list is empty.
- When the allow list has entries only those addresses are accepted and the deny list is ignored.
- Without allow entries the addresses in the deny list are rejected.
- Entries are single addresses or CIDR ranges, matched with the Node `net.BlockList`. A range needs an integer prefix up to 32 (IPv4) or 128 (IPv6), any other entry is ignored.

## Login Blocks

`LoginAttempts` (`lib/game/server/memory/login-attempts.js`) is created by the `LoginManager` with the `server/security/loginAttempts` configuration (environment values overridden by the configuration rows) and the `ipLists` repository, and it is shared by the game login and the administration panel login.

1. Every failed login calls `LoginAttempts.registerLoginFailure()`, which registers a hit for `identity:<username or email>` and for `address:<request address>` (`GameConst.LOGIN_ATTEMPTS_KEYS`).
2. When a key reaches `maxAttempts` inside the window (`RELDENS_LOGIN_ATTEMPTS_MAX` or `security/loginAttempts/maxAttempts`, the window defaults to the block time) the key is blocked for `blockTimeMs` (`RELDENS_LOGIN_ATTEMPTS_BLOCK_MS` or `security/loginAttempts/blockTimeMs`).
3. An address block is stored as a `deny` row with the reason `Login attempts limit reached.` and the `expires_at` of the block. A repeated block for the same address updates that row, and a permanent `deny` row (without `expires_at`) is never replaced. The identity blocks are kept in memory only.
4. `LoginAttempts.isLoginBlocked()` rejects the login while the identity or the address is blocked, in `LoginManager.processUserRequest()` for the game login and in `LoginManager.roleAuthenticationCallback()` for the administration panel login, with the same invalid login message as a wrong password.
5. On the startup `restoreAddressBlocks()` loads the `deny` rows whose `expires_at` is still in the future back into memory, so a restart does not lift the block. The expired rows stay in the table and are ignored.

The temporary rows never enter the Express or WebSocket lists, they only block the logins.

## Other Counters Per Address

The same `LoginAttempts` registry counts, in memory only:

- `joins:<room type>:` and `joinsIdentity:<room type>:` - room joins per address and per username in `RoomLogin.isJoinsLimitReached()`, with `RELDENS_GAME_LOGIN_MAX_JOINS` in `RELDENS_GAME_LOGIN_WINDOW_MS` for the game room and `RELDENS_ROOMS_LOGIN_MAX_JOINS` in `RELDENS_ROOMS_LOGIN_WINDOW_MS` for the scene and feature rooms.
- `guests:` - guest accounts created per address (`RELDENS_GUESTS_MAX_PER_IP`).
- `registration:` - accounts registered per address (`RELDENS_REGISTRATION_MAX_PER_IP`).
- `forgotAddress:` - forgot password requests per address, with the registration maximum.

The registry keys are `Map` entries: the expired hits and blocks are swept once per window, the identities are truncated to 255 characters in the keys, and at 50000 tracked keys the oldest key is evicted.

The `LoginManager` also caps the password validations running at the same time (`RELDENS_MAX_CONCURRENT_PASSWORD_VALIDATIONS`), the validation uses the asynchronous pbkdf2 of `Encryptor.validatePassword()` so it does not block the event loop.

## Administration Panel Login Limiter

Independent from the lists: `CreateAdminSubscriber.applyLoginRateLimit()` mounts an `express-rate-limit` limiter on the administration login POST, keyed by the address and the submitted email, where only the failed logins count (`RELDENS_ADMIN_LOGIN_MAX_ATTEMPTS` in `RELDENS_ADMIN_LOGIN_WINDOW_MS`) and the next request gets `429`. In development mode (`NODE_ENV` is `development`, `dev` or `test`, or the domain of a plain `http://` `RELDENS_APP_HOST` or `RELDENS_PUBLIC_URL` matches a development pattern like `localhost`, `127.0.0.1` or `.local`) `RateLimitConfigurer.createLimiter()` multiplies the limit by the `developmentMultiplier` (10), the e2e suite reads the real limit from the `RateLimit` response header.

## Tests

- `tests/test-login-attempts.js` - stored blocks restore, stored block update, the permanent deny row protection, the sweep, the tracked keys cap and the identity truncation.
- `tests/test-ip-lists-entity-subscriber.js` - the admin saved and deleted rows refresh the lists.
- `tests/test-room-login-auth.js` - the scene joins limit per address and per username.
- `tests/e2e/test-login-security.spec.js` - lockout with the stored block and the simulated restart, the denied address page and room join.
- `tests/e2e/test-admin-security.spec.js` - administration panel login limiter.
- `tests/e2e/helpers/security-state.js` - e2e endpoints that deny addresses for a short time and clear the lists, the stored rows and the login attempts before every test.
