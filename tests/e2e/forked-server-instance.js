/**
 *
 * Reldens - Forked Server Instance
 *
 * Entry of a numbered e2e game server (server-2 and on) forked by E2eServerInstances from the Playwright global setup:
 * logs to test-results/<server key>.log, boots the instance with the same startup as server-1
 * (CollectGameData.startServer, its config from tests/config.json with its "servers" entry) on its own port, registers
 * the same e2e endpoints with the players snapshots of the shared database, answers "ready" to the global setup, and on
 * "shutdown" runs the same teardown as server-1 (ServerTeardown) and ends; it also ends when the global setup process
 * is gone, so no instance keeps its port after an aborted run.
 *
 */

const { CollectGameData } = require('./collect-game-data');
const { ServerTeardown } = require('./server-teardown');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { ServerPathResolver } = require('../server-path-resolver');
const { Logger, sc } = require('@reldens/utils');

class ForkedServerInstance
{

    static async run()
    {
        let serverKey = sc.get(process.env, E2eServerInstances.SERVER_KEY_ENV, '');
        let serverUrl = sc.get(E2eServerInstances.fetchServersUrls(), serverKey, '');
        if('' === serverUrl){
            Logger.critical('[forked-server-instance] No port given for the instance "'+serverKey+'".');
            process.exit(1);
        }
        let config = E2eServerInstances.fetchServerConfig(CollectGameData.loadConfig(), serverKey);
        CollectGameData.setupLogCapture(serverKey+'.log');
        process.env.RELDENS_E2E_PORT = new URL(serverUrl).port;
        let server = await CollectGameData.startServer(ServerPathResolver.resolve(config.serverPath), config);
        await CollectGameData.registerEndpoints(server.serverManager, config);
        process.on('message', async (message) => {
            if(E2eServerInstances.SHUTDOWN_MESSAGE !== message){
                return;
            }
            await ServerTeardown.run();
            process.exit(0);
        });
        process.on('disconnect', () => process.exit(0));
        process.send(E2eServerInstances.READY_MESSAGE);
    }

}

ForkedServerInstance.run().catch((error) => {
    Logger.critical('[forked-server-instance] The instance failed to start: '+error.message);
    process.exit(1);
});
