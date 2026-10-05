/**
 *
 * Reldens - Run Tests
 *
 * Invokes the Playwright CLI with the project config. Before launching it: looks for a free e2e port from the
 * configured one through the next 4 (warns on each busy port, exits when all 5 are busy) and, when
 * --db-reset=<dbName> names the tests/config.json database, drops every table and rebuilds the database with the
 * production scripts (migrations/production) so the e2e runs against a clean production DB. Supports --long,
 * --filter, --port, --clean-output and --db-reset flags.
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
    static portAttempts = 5;

    static async run()
    {
        let config = FileHandler.fetchFileJson(FileHandler.joinPaths(process.cwd(), 'tests', 'config.json'));
        if(!config){
            Logger.error('Cannot run e2e tests: tests/config.json not found.');
            process.exit(1);
        }
        let portArg = process.argv.find(a => a.startsWith('--port='));
        let requestedPort = portArg ? portArg.slice('--port='.length) : (process.env.npm_config_port || config.port || 8080);
        let port = await RunTests.findAvailablePort(Number(requestedPort));
        if(!port){
            process.exit(1);
        }
        let dbResetArg = process.argv.find(a => a.startsWith('--db-reset'));
        let dbResetName = dbResetArg ? dbResetArg.slice('--db-reset='.length) : (process.env.npm_config_db_reset || '');
        if(dbResetArg || '' !== dbResetName){
            if(!await RunTests.resetDatabase(config, dbResetName)){
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
        let maxFailuresArg = process.argv.find(a => a.startsWith('--max-failures='));
        if(maxFailuresArg){
            process.env.RELDENS_E2E_MAX_FAILURES = maxFailuresArg.slice('--max-failures='.length);
        }
        if(process.argv.includes('--all') || 'true' === process.env.npm_config_all){
            process.env.RELDENS_E2E_MAX_FAILURES = '0';
        }
        let filterArg = process.argv.find(a => a.startsWith('--filter='));
        let filterValue = filterArg ? filterArg.slice('--filter='.length) : (process.env.npm_config_filter || null);
        let playwrightArgs = ['playwright', 'test', '--config=tests/e2e/playwright.config.js'];
        if(filterValue){
            playwrightArgs.push('--grep', '"'+filterValue+'"', '--no-deps');
        }
        let result = spawnSync(
            'npx',
            playwrightArgs,
            {stdio: ['ignore', 'inherit', 'inherit'], env: process.env, shell: true}
        );
        if(result.error){
            Logger.critical('Playwright could not be launched: '+result.error.message);
            process.exit(1);
        }
        if(result.signal){
            Logger.critical('Playwright was ended by the signal '+result.signal+'.');
            process.exit(1);
        }
        if(0 !== result.status){
            Logger.error('Playwright ended with the exit code '+result.status+'.');
            process.exit(result.status);
        }
        Logger.info('Playwright ended with the exit code 0.');
        process.exit(0);
    }

    static async findAvailablePort(firstPort)
    {
        let lastPort = firstPort+RunTests.portAttempts-1;
        for(let port = firstPort; port <= lastPort; port++){
            if(await RunTests.isPortAvailable(port)){
                return port;
            }
        }
        Logger.critical('No free port between '+firstPort+' and '+lastPort+', free one of them and run again.');
        return false;
    }

    static async isPortAvailable(port)
    {
        let tester = net.createServer();
        tester.listen(port, 'localhost');
        try {
            await once(tester, 'listening');
        } catch(error){
            Logger.warning('Port '+port+' is not available ('+error.message+'), checking the next port.');
            return false;
        }
        tester.close();
        await once(tester, 'close');
        return true;
    }

    static async resetDatabase(config, dbResetName)
    {
        if(!config.dbName || config.dbName !== dbResetName){
            Logger.error(
                'Database reset refused: pass --db-reset='+config.dbName+' to confirm the tests/config.json database'
                +' can be dropped.'
            );
            return false;
        }
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
