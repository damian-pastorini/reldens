/**
 *
 * Reldens - Room Objects Api
 *
 * HTTP client for the e2e room objects endpoints registered by RoomObjectsState: the server snapshot of the room
 * bodies with state, the enemies switch off until the next players reset, the enemy placement next to a player (with
 * the targeting of that exact enemy body on its placed position), the player placement next to an object (waiting for
 * the client to show the player on the placed position), the enemy attack on a player, the player
 * placement next to another player and the player affected property (hp) value.
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

    static async placeAndTargetEnemy(page, gameConfig, roomName, enemyKey, enemyLife, timeout)
    {
        let placement = await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/place-enemy',
            {
                roomName,
                enemyKey,
                enemyLife,
                sessionId: await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)
            }
        );
        if(!placement.position){
            return placement;
        }
        placement.targeted = await RoomObjectsApi.targetBodyAtPosition(page, placement.bodyKey, placement.position, timeout);
        return placement;
    }

    static async targetBodyAtPosition(page, bodyKey, position, timeout)
    {
        return await (await page.waitForFunction((args) => {
            let scene = window.reldens.getActiveScene();
            let room = window.reldens.activeRoomEvents.room;
            if(!scene || !scene.player || !room.state || !room.state.bodies){
                return false;
            }
            let bodyState = room.state.bodies.get(args.bodyKey);
            let animation = scene.objectsAnimations[args.bodyKey];
            if(!bodyState || !animation || args.x !== bodyState.x || args.y !== bodyState.y){
                return false;
            }
            scene.player.currentTarget = {id: animation.key, type: 'obj'};
            window.reldens.gameEngine.showTarget(animation.targetName || animation.key, scene.player.currentTarget, false);
            return true;
        }, {bodyKey, x: position.x, y: position.y}, {timeout})).jsonValue();
    }

    static async waitForPlayerAtPosition(page, position, timeout)
    {
        return await (await page.waitForFunction((args) => {
            let room = window.reldens.activeRoomEvents.room;
            if(!room.state || !room.state.players){
                return false;
            }
            let player = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!player){
                return false;
            }
            return args.x === player.state.x && args.y === player.state.y;
        }, {x: position.x, y: position.y}, {timeout})).jsonValue();
    }

    static async placePlayerNextToObject(page, gameConfig, roomName, objectKey, timeout)
    {
        let placement = await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/place-player-next-to-object',
            {roomName, objectKey, sessionId: await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)}
        );
        if(!placement.position){
            return placement;
        }
        placement.reached = await RoomObjectsApi.waitForPlayerAtPosition(page, placement.position, timeout);
        return placement;
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

    static async setPlayerAffectedProperty(gameConfig, roomName, playerName, value)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/player-affected-property',
            {roomName, playerName, value}
        );
    }

}

module.exports.RoomObjectsApi = RoomObjectsApi;
