/**
 *
 * Reldens - Player Reset
 *
 * HTTP client that calls the server's e2e reset endpoint before each test to restore
 * player stats and room state to a known baseline.
 *
 */

const { Logger } = require('@reldens/utils');

class PlayerReset
{
    static async resetAll(baseUrl)
    {
        let url = new URL('/api/e2e/reset-players', baseUrl);
        try {
            return await (await fetch(url.toString(), { method: 'POST' })).json();
        } catch(error){
            Logger.warning('[player-reset] Reset request failed: '+error.message);
            return { ok: false };
        }
    }
}

module.exports.PlayerReset = PlayerReset;
