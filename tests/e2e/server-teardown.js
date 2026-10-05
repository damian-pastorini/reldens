/**
 *
 * Reldens - Server Teardown
 *
 * Playwright globalTeardown: restores the security state changed by the last test (bans, address lists, reset
 * emails and mailer), so it never reaches the next run on the same database, and gracefully shuts down the game
 * server after the test suite completes.
 *
 */

const { Logger } = require('@reldens/utils');
const { CollectGameData } = require('./collect-game-data');
const { SecurityState } = require('./helpers/security-state');

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
        await SecurityState.resetAll(serverManager);
        await serverManager.gameServer.gracefullyShutdown(false);
        Logger.info('[server-teardown] Server shutdown complete.');
    }
}

module.exports = async function()
{
    await ServerTeardown.run();
};
