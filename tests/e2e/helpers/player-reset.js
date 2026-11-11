/**
 *
 * Reldens - Player Reset
 *
 * HTTP client that calls the server's e2e reset endpoint before each test to restore the players and the rooms of the
 * parallel spec group the test belongs to to a known baseline, on server-1 and then on every numbered instance
 * running (E2eServerInstances), so the live rooms, overrides and seeded rows of every server start clean.
 *
 */

const { SecurityApi } = require('./security-api');
const { E2eServerInstances } = require('./e2e-server-instances');
const { Logger } = require('@reldens/utils');

class PlayerReset
{
    static async resetAll(gameConfig, group)
    {
        let resetResult = await PlayerReset.resetServer(gameConfig, group);
        for(let serverKey of Object.keys(E2eServerInstances.fetchServersUrls())){
            await PlayerReset.resetServer(E2eServerInstances.forServer(gameConfig, serverKey), group);
        }
        return resetResult;
    }

    static async resetServer(gameConfig, group)
    {
        try {
            return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/reset-players', {group});
        } catch(error){
            Logger.warning('[player-reset] Reset request failed: '+error.message);
            return { ok: false };
        }
    }
}

module.exports.PlayerReset = PlayerReset;
