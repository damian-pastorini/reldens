/**
 *
 * Reldens - Playwright Config
 *
 * Configures the Playwright test runner: browser, base URL, workers, retries, and lifecycle hooks. Every parallel spec
 * group (ParallelSpecGroups) is a project with one worker, the groups run at the same time and the exclusive group
 * runs after them; the run stops when a spec does not belong to any group, since it would never run.
 *
 */

const { defineConfig } = require('@playwright/test');
const { FileHandler } = require('@reldens/server-utils');
const { TimeConstants } = require('./helpers/time-constants');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
let configPath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json');
let testConfig = FileHandler.exists(configPath) ? FileHandler.fetchFileJson(configPath) : {};

let longRun = '1' === process.env.LONG_RUN;
let envPort = process.env.RELDENS_E2E_PORT || null;
let baseUrl = envPort ? 'http://localhost:'+envPort : (testConfig.baseUrl || 'http://localhost:8080');
let testResultsDir = FileHandler.joinPaths(process.cwd(), 'test-results', 'playwright');
let launchOptions = { slowMo: longRun ? 400 : 0, headless: true, channel: 'chromium' };
let maxFailures = Number(process.env.RELDENS_E2E_MAX_FAILURES || '1');
let browserExecutablePath = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE || '';
if(browserExecutablePath){
    launchOptions.executablePath = browserExecutablePath;
}
if(!ParallelSpecGroups.validateSpecsGroups(FileHandler.joinPaths(process.cwd(), 'tests', 'e2e'))){
    process.exit(1);
}

module.exports = defineConfig({
    globalSetup: './collect-game-data.js',
    globalTeardown: './server-teardown.js',
    testDir: '.',
    outputDir: testResultsDir,
    workers: Object.keys(ParallelSpecGroups.GROUPS).length - 1,
    projects: ParallelSpecGroups.buildProjects(),
    maxFailures: maxFailures,
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
        launchOptions: launchOptions,
    },
});
