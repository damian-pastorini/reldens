/**
 *
 * Reldens - Playwright Config
 *
 * Configures the Playwright test runner: browser, base URL, workers, retries, and lifecycle hooks.
 *
 */

const { defineConfig } = require('@playwright/test');
const { FileHandler } = require('@reldens/server-utils');

let configPath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json');
let testConfig = FileHandler.exists(configPath) ? FileHandler.fetchFileJson(configPath) : {};

let longRun = process.env.LONG_RUN === '1';
let baseUrl = testConfig.baseUrl || 'http://localhost:8080';
let testResultsDir = FileHandler.joinPaths(process.cwd(), 'test-results');

module.exports = defineConfig({
    globalSetup: './collect-game-data.js',
    globalTeardown: './server-teardown.js',
    testDir: '.',
    outputDir: testResultsDir,
    globalTimeout: longRun ? 3600000 : 300000,
    timeout: longRun ? 300000 : 60000,
    workers: 1,
    maxFailures: 1,
    retries: 0,
    reporter: [['line']],
    use: {
        baseURL: baseUrl,
        viewport: { width: 1920, height: 1080 },
        video: { mode: 'on', size: { width: 1920, height: 1080 } },
        screenshot: 'only-on-failure',
        launchOptions: { slowMo: longRun ? 400 : 0, headless: true },
    },
});
