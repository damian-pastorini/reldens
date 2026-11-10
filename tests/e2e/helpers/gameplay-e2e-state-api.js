/**
 *
 * Reldens - Gameplay E2E State Api
 *
 * HTTP client for the e2e endpoints registered by GameplayE2eStateProbe: the live player snapshot, the player state
 * (dead, disabled or active), the enemy body life set and read, and the scores period reset check on a given date; and
 * by LiveObjectsOverrides: a property of the live enemies of a key changed or removed, a teleport NPC option added with
 * its destination, the next calls of a room method made to reject with the failures done read back, and the restore of
 * every live object change of a group; by FeaturePropertiesOverrides: a property of a live feature object changed by
 * its path in the features list; and by CombatE2eState: the live player and
 * enemy stats, the player skill properties and snapshot, and the recorded damages and end states of the player skills.
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

    static async changeRoomProperty(gameConfig, group, roomName, propertyKey, value)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/room-property',
            {group, roomName, propertyKey, value}
        );
    }

    static async failRoomMethod(gameConfig, group, roomName, methodKey, failuresCount, rejects = true)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/room-method-override',
            {group, roomName, methodKey, failuresCount, rejects}
        );
    }

    static async fetchRoomMethodFailures(gameConfig, roomName, methodKey)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/live-objects/room-method-failures?roomName='+encodeURIComponent(roomName)
                +'&methodKey='+encodeURIComponent(methodKey)
        );
    }

    static async restoreLiveObjects(gameConfig, group)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/live-objects/restore', {group});
    }

    static async setPlayerStats(gameConfig, roomName, playerName, stats)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/combat/player-stats', {roomName, playerName, stats});
    }

    static async setEnemyStats(gameConfig, roomName, bodyKey, stats, inState = 0)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/combat/enemy-stats',
            {roomName, bodyKey, stats, inState}
        );
    }

    static async changePlayerSkill(gameConfig, group, roomName, playerName, skillKey, properties)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/combat/player-skill',
            {group, roomName, playerName, skillKey, properties}
        );
    }

    static async fetchPlayerSkill(gameConfig, roomName, playerName, skillKey)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/combat/player-skill?roomName='+encodeURIComponent(roomName)
            +'&playerName='+encodeURIComponent(playerName)+'&skillKey='+encodeURIComponent(skillKey)
        );
    }

    static async changeRoomCustomData(gameConfig, group, roomName, customData)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/combat/room-custom-data',
            {group, roomName, customData}
        );
    }

    static async changeEnemyBattle(gameConfig, group, roomName, bodyKey, properties, isBattle = true)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/combat/enemy-battle',
            {group, roomName, bodyKey, properties, isBattle}
        );
    }

    static async changePlayerBody(gameConfig, group, roomName, playerName, properties)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/combat/player-body',
            {group, roomName, playerName, properties}
        );
    }

    static async setPvpEnabled(gameConfig, group, enabled)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/combat/pvp-enabled', {group, enabled});
    }

    static async recordPlayerSkills(gameConfig, roomName, playerName)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/combat/record-skills', {roomName, playerName});
    }

    static async disposeRoom(gameConfig, roomName)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/live-objects/dispose-room', {roomName});
    }

    static async changeBodyProperty(gameConfig, group, roomName, bodyOwner, propertyKey, value)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/body-property',
            {group, roomName, bodyOwner, propertyKey, value}
        );
    }

    static async changeFeatureProperty(gameConfig, group, featurePath, propertyKey, value)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/feature-property',
            {group, featurePath, propertyKey, value}
        );
    }

    static async delayRoomMethod(gameConfig, group, roomName, methodKey, delayMs)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/room-method-override',
            {group, roomName, methodKey, delayMs}
        );
    }

    static async hideRoomClient(gameConfig, group, roomName, playerName)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/live-objects/hidden-client',
            {group, roomName, playerName}
        );
    }

    static async fetchRecoveryTicks(gameConfig)
    {
        return await SecurityApi.request(gameConfig, 'GET', '/api/e2e/gameplay/recovery-ticks');
    }

    static async fetchRecordedSkills(gameConfig, playerName)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/combat/recorded-skills?playerName='+encodeURIComponent(playerName)
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
