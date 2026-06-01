/**
 *
 * Reldens - Server Teardown
 *
 * Playwright globalTeardown: gracefully shuts down the game server after the test suite completes.
 *
 */

const { Logger } = require('@reldens/utils');
const { CollectGameData } = require('./collect-game-data');

class ServerTeardown
{
    static async run()
    {
        let serverManager = CollectGameData.serverManager;
        if(!serverManager) {
            Logger.info('[server-teardown] No server manager to shut down.');
            return;
        }
        if(!serverManager.gameServer) {
            Logger.info('[server-teardown] No game server to shut down.');
            return;
        }
        await serverManager.gameServer.gracefullyShutdown();
        Logger.info('[server-teardown] Server shutdown complete.');
    }
}

module.exports = async function()
{
    await ServerTeardown.run();
};
