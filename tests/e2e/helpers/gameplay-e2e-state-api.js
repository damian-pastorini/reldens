/**
 *
 * Reldens - Gameplay E2E State Api
 *
 * HTTP client for the e2e endpoints registered by GameplayE2eStateProbe: the live player snapshot, the enemy body life
 * set and read, and the scores period reset check on a given date.
 *
 */

const { SecurityApi } = require('./security-api');

class GameplayE2eStateApi
{

    static async fetchPlayer(gameConfig, roomName, playerName)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/gameplay/player?roomName='+encodeURIComponent(roomName)+'&playerName='+encodeURIComponent(playerName)
        );
    }

    static async setEnemyLife(gameConfig, roomName, enemyKey, life)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/gameplay/enemy-life', {roomName, enemyKey, life});
    }

    static async fetchEnemyLife(gameConfig, roomName, bodyKey)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/gameplay/enemy-life?roomName='+encodeURIComponent(roomName)+'&bodyKey='+encodeURIComponent(bodyKey)
        );
    }

    static async runScoresResetCheck(gameConfig, isoDate, previousPeriodKey)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/gameplay/scores-reset-check',
            {isoDate, previousPeriodKey}
        )).checkResult;
    }

}

module.exports.GameplayE2eStateApi = GameplayE2eStateApi;
