/**
 *
 * Reldens - Gameplay E2E State Api
 *
 * HTTP client for the e2e endpoints registered by GameplayE2eStateProbe: the live player snapshot, the player state
 * (dead, disabled or active), the enemy body life set and read, and the scores period reset check on a given date; and
 * by LiveObjectsOverrides: a property of the live enemies of a key changed or removed, a teleport NPC option added with
 * its destination, and the restore of every live object change of a group.
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

    static async setPlayerState(gameConfig, roomName, playerName, inState)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/gameplay/player-state',
            {roomName, playerName, inState}
        );
    }

    static async setEnemyLife(gameConfig, roomName, enemyKey, life)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/gameplay/enemy-life', {roomName, enemyKey, life});
    }

    static async setEnemyBodyLife(gameConfig, roomName, bodyKey, life)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/gameplay/enemy-body-life', {roomName, bodyKey, life});
    }

    static async fetchEnemyLife(gameConfig, roomName, bodyKey)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/gameplay/enemy-life?roomName='+encodeURIComponent(roomName)+'&bodyKey='+encodeURIComponent(bodyKey)
        );
    }

    static async changeEnemiesProperty(gameConfig, group, roomName, enemyKey, propertyChange)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/enemy-property',
            Object.assign({group, roomName, enemyKey}, propertyChange)
        );
    }

    static async addTeleportOption(gameConfig, group, roomName, objectKey, teleportOption)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/teleport-option',
            Object.assign({group, roomName, objectKey}, teleportOption)
        );
    }

    static async restoreLiveObjects(gameConfig, group)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/live-objects/restore', {group});
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
