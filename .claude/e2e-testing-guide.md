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
- `--db-reset` - reseeds the database from `migrations/production` before the run
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

To rebuild the e2e database, drop it and run the production scripts from `migrations/production`:
`reldens-install-v4.0.0.sql`, `reldens-basic-config-v4.0.0.sql`, `reldens-sample-data-v4.0.0.sql`. The same
basic-config and sample-data pair is what `--db-reset` applies.

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

## Browser binaries

The Playwright version in `package.json` pins a chromium revision (`node_modules/playwright-core/browsers.json`).
When the matching build is not installed every test fails instantly with
`browserType.launch: Executable doesn't exist`. Install it with `npx playwright install chromium`, or point
`PLAYWRIGHT_BROWSER_EXECUTABLE` at an installed chromium or chrome-headless-shell executable.

## Outputs

Written under `test-results/` (gitignored):

- `videos/<test-title-slug>.webm` - one per test, plus `-player2` for two-page specs
- `screenshots/<test-title-slug>/` - numbered captures taken by the specs
- `server.log` - the game server log for the run
- `tests.log` - the test worker log
- `test-<spec>-<hash>-<title>/` - only created for failures, holds `error-context.md` and `test-failed-1.png`

The manual verification pages in `.claude/tests-guide/` link these videos with a relative path, so they only
resolve when the guide is opened from the same working copy that produced the run.

## Reading a failure

Start with `test-results/test-*/error-context.md`: it names the spec, the failing call and the page snapshot at
that moment. Then check `test-results/server.log` for the server side of the same timestamp. A timeout on
`#player-selection:not(.hidden)` means login never completed; a timeout on `window.reldens` means the client
bundle never initialized.
