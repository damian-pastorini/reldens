/**
 *
 * Reldens - Server Teardown
 *
 * Playwright globalTeardown: shuts down every next numbered instance (E2eServerInstances, server-2), restores the
 * security state changed by the last test (bans, address lists, reset emails and mailer), so it never reaches the next
 * run on the same database, and gracefully shuts down the game server after the test suite completes. A numbered
 * instance runs the same teardown from its own process before it ends.
 *
 */

const { Logger } = require('@reldens/utils');
const { CollectGameData } = require('./collect-game-data');
const { SecurityState } = require('./helpers/security-state');
const { E2eSeedAndRestoreEndpoints } = require('./helpers/e2e-seed-and-restore-endpoints');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');

class ServerTeardown
{
    static async run()
    {
        await E2eServerInstances.stopInstances();
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
        await E2eSeedAndRestoreEndpoints.resetAllGroups(serverManager);
        await serverManager.gameServer.gracefullyShutdown(false);
        Logger.info('[server-teardown] Server shutdown complete.');
    }
}

module.exports = async function()
{
    await ServerTeardown.run();
};

module.exports.ServerTeardown = ServerTeardown;
