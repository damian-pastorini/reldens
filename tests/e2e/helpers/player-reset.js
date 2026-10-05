/**
 *
 * Reldens - Player Reset
 *
 * HTTP client that calls the server's e2e reset endpoint before each test to restore the players and the rooms of the
 * parallel spec group the test belongs to to a known baseline.
 *
 */

const { SecurityApi } = require('./security-api');
const { Logger } = require('@reldens/utils');

class PlayerReset
{
    static async resetAll(gameConfig, group)
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
