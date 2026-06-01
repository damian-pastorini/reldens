/**
 *
 * Reldens - Playwright Config
 *
 * Configures the Playwright test runner: browser, base URL, workers, retries, and lifecycle hooks.
 *
 */

const { defineConfig } = require('@playwright/test');
const { FileHandler } = require('@reldens/server-utils');
const { TimeConstants } = require('./helpers/time-constants');
let configPath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json');
let testConfig = FileHandler.exists(configPath) ? FileHandler.fetchFileJson(configPath) : {};

let longRun = '1' === process.env.LONG_RUN;
let envPort = process.env.RELDENS_E2E_PORT || null;
let baseUrl = envPort ? 'http://localhost:'+envPort : (testConfig.baseUrl || 'http://localhost:8080');
let testResultsDir = FileHandler.joinPaths(process.cwd(), 'test-results');

module.exports = defineConfig({
    globalSetup: './collect-game-data.js',
    globalTeardown: './server-teardown.js',
    testDir: '.',
    outputDir: testResultsDir,
    workers: 1,
    maxFailures: 0,
    retries: 0,
    timeout: TimeConstants.forLongRun(60000, longRun),
    reporter: [['./reporters/test-progress-reporter.js']],
    expect: { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) },
    use: {
        baseURL: baseUrl,
        actionTimeout: TimeConstants.forLongRun(TimeConstants.ACTION, longRun),
        navigationTimeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun),
        viewport: { width: 1920, height: 1080 },
        video: { mode: 'on', size: { width: 1920, height: 1080 } },
        screenshot: 'only-on-failure',
        launchOptions: { slowMo: longRun ? 400 : 0, headless: true },
    },
});
