/**
 *
 * Reldens - Run Tests
 *
 * Invokes the Playwright CLI with the project config. Supports --long and --filter flags.
 *
 */

const { spawnSync } = require('node:child_process');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class RunTests
{
    static run()
    {
        let longRun = process.argv.includes('--long') || process.env.LONG_RUN === '1';
        let cleanOutput = process.argv.includes('--clean-output') || process.env.npm_config_clean_output === 'true';
        if(cleanOutput) {
            let testResultsDir = FileHandler.joinPaths(process.cwd(), 'test-results');
            if(FileHandler.exists(testResultsDir)) {
                Logger.info('Cleaning test-results folder...');
                FileHandler.remove(testResultsDir);
            }
        }
        if(longRun) {
            process.env.LONG_RUN = '1';
        }
        let filterArg = process.argv.find(a => a.startsWith('--filter='));
        let filterValue = filterArg ? filterArg.slice('--filter='.length) : (process.env.npm_config_filter || null);
        let playwrightArgs = ['playwright', 'test', '--config=tests/e2e/playwright.config.js'];
        if(filterValue) {
            playwrightArgs.push('--grep', filterValue);
        }
        let result = spawnSync(
            'npx',
            playwrightArgs,
            { stdio: ['ignore', 'inherit', 'inherit'], env: process.env, shell: true }
        );
        process.exit(result.status || 0);
    }
}

module.exports.RunTests = RunTests;

if(require.main === module) {
    RunTests.run();
}
