/**
 *
 * Reldens - Room Objects Api
 *
 * HTTP client for the e2e room objects endpoints registered by RoomObjectsState: the server snapshot of the room
 * bodies with state, the enemies switch off until the next players reset, the enemy attack on a player and the
 * player placement next to another player.
 *
 */

const { SecurityApi } = require('./security-api');

class RoomObjectsApi
{

    static async fetchRoomObjects(gameConfig, roomName)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/room-objects?roomName='+encodeURIComponent(roomName)
        )).objects;
    }

    static async disableEnemies(gameConfig, roomName, onlyAggressive = false)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/disable-enemies',
            {roomName, onlyAggressive}
        )).disabled;
    }

    static async startEnemyAttack(gameConfig, roomName, playerName, assetKey)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/enemy-attack',
            {roomName, playerName, assetKey}
        );
    }

    static async placePlayerNearPlayer(gameConfig, roomName, playerName, nearPlayerName)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/place-player',
            {roomName, playerName, nearPlayerName}
        );
    }

}

module.exports.RoomObjectsApi = RoomObjectsApi;
