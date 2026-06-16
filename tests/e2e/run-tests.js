/**
 *
 * Reldens - Run Tests
 *
 * Invokes the Playwright CLI with the project config. Before launching it: verifies the e2e port is
 * free (exits with a clear message instead of freezing if it is busy) and, when --db-reset is passed,
 * reseeds the database with the production data (migrations/production) so the e2e runs against a
 * clean production DB. Supports --long, --filter, --port, --clean-output and --db-reset flags.
 *
 */

const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');
const { DatabaseResetUtility } = require('../database-reset-utility');

class RunTests
{
    static async run()
    {
        let config = FileHandler.fetchFileJson(FileHandler.joinPaths(process.cwd(), 'tests', 'config.json'));
        if(!config){
            Logger.error('Cannot run e2e tests: tests/config.json not found.');
            process.exit(1);
        }
        let portArg = process.argv.find(a => a.startsWith('--port='));
        let port = portArg ? portArg.slice('--port='.length) : (process.env.npm_config_port || config.port || 8080);
        if(!await RunTests.ensurePortAvailable(port)){
            process.exit(1);
        }
        if(process.argv.includes('--db-reset') || 'true' === process.env.npm_config_db_reset){
            if(!await RunTests.resetDatabase(config)){
                process.exit(1);
            }
        }
        if(process.argv.includes('--clean-output') || 'true' === process.env.npm_config_clean_output){
            Logger.info('Cleaning test-results folder...');
            FileHandler.remove(FileHandler.joinPaths(process.cwd(), 'test-results'));
        }
        if(process.argv.includes('--long') || '1' === process.env.LONG_RUN){
            process.env.LONG_RUN = '1';
        }
        process.env.RELDENS_E2E_PORT = String(port);
        let filterArg = process.argv.find(a => a.startsWith('--filter='));
        let filterValue = filterArg ? filterArg.slice('--filter='.length) : (process.env.npm_config_filter || null);
        let playwrightArgs = ['playwright', 'test', '--config=tests/e2e/playwright.config.js'];
        if(filterValue){
            playwrightArgs.push('--grep', filterValue);
        }
        let result = spawnSync(
            'npx',
            playwrightArgs,
            {stdio: ['ignore', 'inherit', 'inherit'], env: process.env, shell: true}
        );
        process.exit(result.status || 0);
    }

    static async ensurePortAvailable(port)
    {
        let tester = net.createServer();
        tester.listen(Number(port), 'localhost');
        try {
            await once(tester, 'listening');
        } catch(error){
            Logger.error('Server initialization failed: port '+port+' is already in use ('+error.message+'), free it and run again.');
            return false;
        }
        tester.close();
        await once(tester, 'close');
        return true;
    }

    static async resetDatabase(config)
    {
        let productionPath = FileHandler.joinPaths(process.cwd(), 'migrations', 'production');
        Logger.info('Resetting database with production data before e2e run...');
        if(!await new DatabaseResetUtility(config, [
            {path: productionPath, file: 'reldens-basic-config-v4.0.0.sql', label: 'Basic config'},
            {path: productionPath, file: 'reldens-sample-data-v4.0.0.sql', label: 'Sample data'}
        ]).resetDatabase()){
            Logger.error('Database reset failed - aborting e2e run.');
            return false;
        }
        Logger.info('Database reset completed.');
        return true;
    }
}

module.exports.RunTests = RunTests;

if(require.main === module){
    RunTests.run().catch((error) => {
        Logger.error('Run tests error: '+error.message);
        process.exit(1);
    });
}
