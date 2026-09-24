# E2E Testing Guide

Playwright end-to-end suite under `tests/e2e/`. It boots a real Reldens server against a real database and
drives the real client in a browser.

## Commands

```bash
npm run test:e2e
# wipes test-results/ first
npm run test:e2e:clean
# slowMo 400ms and longer waits, for watchable videos
npm run test:e2e:long
npm run test:e2e:long:clean
```

Flags accepted by `tests/e2e/run-tests.js`:

- `--long` - slow motion plus scaled timeouts (also via `LONG_RUN=1`)
- `--filter=<text>` - passed to Playwright as `--grep`
- `--port=<port>` - overrides the port from `tests/config.json`
- `--clean-output` - removes `test-results/` before the run
- `--db-reset` - drops every table and rebuilds the database from `migrations/production` before the run
- `--max-failures=<n>` - overrides the stop-on-failure limit
- `--all` - runs every test regardless of failures

## Stop on first failure

`maxFailures` defaults to `1` (`tests/e2e/playwright.config.js`), so the run aborts on the first failing test
instead of burning the whole suite on one upstream break. Override with `RELDENS_E2E_MAX_FAILURES` or `--all`.

## Database

The suite uses its OWN database, `reldens_local`, declared in `tests/config.json`. This is deliberate: it keeps
the e2e run from touching the branch database named in `app/.env`. `collect-game-data.js` calls
`DatabaseEnvVarsExporter.apply(config)`, so the values in `tests/config.json` override the app `.env` for the
whole run.

Do NOT point `tests/config.json` at the branch database.

`--db-reset` rebuilds the e2e database from scratch on every run, so each run starts from the same content:
`DatabaseResetUtility` (`tests/database-reset-utility.js`) drops every table of the configured database with
`tests/fixtures/database-drop-tables.sql`, then runs the production scripts from `migrations/production`:
`reldens-install-v4.0.0.sql`, `reldens-basic-config-v4.0.0.sql` and `reldens-sample-data-v4.0.0.sql`. The unit
tests (`npm run test:default`) run the same drop and install before the basic config and
`migrations/development/reldens-test-sample-data-v4.0.0.sql`. Tables or columns left by an older schema never
survive a reset.

### Required accounts

The sample data must contain the three users the specs log in as: `root`, `root2` and `root3`, with players
`ImRoot`, `ImRoot2` and `ImRoot3`. The setup logs `[collect-game-data] User not found: root2` and snapshots
fewer than 3 players when they are missing. Every multi-player spec (global, private and cross-player chat,
teams, trading, double login) then fails waiting for `#player-selection:not(.hidden)`, which reads as a chat or
trading bug but is really a missing account.

## App under test

`tests/config.json` `serverPath` points at the app folder (a sibling `app/` checkout). The server is booted in
process by the Playwright `globalSetup` (`tests/e2e/collect-game-data.js`) and the browser loads that app's
`dist/index.html`.

If `dist/index.html` still references `src="./index.js"` the client was never bundled, so `window.reldens`
never exists and every spec times out after 10 seconds waiting for it. `ClientBundleCheck.isMissing()` detects
this and the setup enables the bundler for that run; the bundle step adds about a minute before the first test.

## Security state between tests

The page fixture calls `/api/e2e/reset-players` before every test (`PlayerReset.resetAll()`), and that endpoint runs
`SecurityState.resetAll()` (`tests/e2e/helpers/security-state.js`) before restoring the players, so the limits, the
lockouts and the blocks left by one spec never reach the next one:

- restores the login attempts maximum, the registration and guests limits per address and the game login joins limit
  (also on the created rooms) captured on the startup
- clears the in memory login attempts, joins and creation counters
- restores the status of the accounts banned by a spec
- lifts the deny list: restores the address lists switch, deletes every `ip_lists` row and rebuilds the lists
- clears the `password_reset_sent_at` of the accounts marked by a spec

The security specs (`test-login-security.spec.js`, `test-admin-security.spec.js`) drive the server state through the
`/api/e2e/security/*` endpoints, wrapped by `tests/e2e/helpers/security-api.js`:

- `POST settings` - lowers the limits a spec needs to reach quickly
- `POST ban-user` - bans an account by username
- `POST deny-addresses` - stores `deny` rows for the given addresses, enables the lists and lifts them after
  `durationMs`, since the browser runs on the same address as the specs
- `GET stored-blocks` and `POST restore-blocks` - lists the stored temporary address blocks and restores them into a
  cleared login attempts registry, which is what a restart does
- `POST mark-reset-sent` and `GET reset-sent-time` - store and read the last reset password email time of a user

The server runs on `localhost`, which turns on the development mode of `AppServerFactory`, so the administration
panel login limiter allows 10 times `RELDENS_ADMIN_LOGIN_MAX_ATTEMPTS`; the limiter spec reads the real limit from the
`RateLimit` response header. See `.claude/ip-lists-and-login-blocks.md` for the lists and blocks flow.

## Browser binaries

The Playwright version in `package.json` pins a chromium revision (`node_modules/playwright-core/browsers.json`).
When the matching build is not installed every test fails instantly with
`browserType.launch: Executable doesn't exist`. Install it with `npx playwright install chromium`, or point
`PLAYWRIGHT_BROWSER_EXECUTABLE` at an installed chromium or chrome-headless-shell executable.

## Outputs

Written under `test-results/` (gitignored):

- `videos/<test-title-slug>.webm` - one per test, plus `-player2` for two-page specs
- `screenshots/<test-title-slug>/` - numbered captures taken by the specs
- `server.log` - the game server startup log, it ends with the `[player-state-reset] Reset endpoint registered.` line
- `tests.log` - the test worker log, which also receives the game server log lines written while the specs run
  (`BaseE2eTest` replaces the `Logger.callback` once the specs load)
- `test-<spec>-<hash>-<title>/` - only created for failures, holds `error-context.md` and `test-failed-1.png`

The manual verification pages in `.claude/tests-guide/` link these videos with a relative path, so they only
resolve when the guide is opened from the same working copy that produced the run.

## Reading a failure

Start with `test-results/test-*/error-context.md`: it names the spec, the failing call and the page snapshot at
that moment. Then check `test-results/tests.log` for the server side of the same timestamp (`server.log` only covers
the startup). A timeout on
`#player-selection:not(.hidden)` means login never completed; a timeout on `window.reldens` means the client
bundle never initialized.
