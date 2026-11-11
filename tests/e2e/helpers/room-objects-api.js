/**
 *
 * Reldens - Room Objects Api
 *
 * HTTP client for the e2e room objects endpoints registered by RoomObjectsState: the server snapshot of the room
 * bodies with state, the enemies switch off until the next players reset (only the aggressive ones, or every one but a
 * given body), the enemy placement next to a player (with
 * the targeting of that exact enemy body on its placed position, optionally holding its aggression until the player
 * attacks it), the player placement next to an object (waiting for
 * the client state and the player sprite on the placed position, optionally some tiles away from the object), the enemy
 * attack on a player, the battle of an already placed enemy, the player
 * placement next to another player, the enemies placed on a clear line from a player moved to a free tile (waiting for
 * the client on the player position), the player affected property (hp) value and the attack on the targeted body
 * repeated until a condition is reached.
 *
 */

const { SecurityApi } = require('./security-api');
const { RoomMovementApi } = require('./room-movement-api');
const { Selectors } = require('../selectors');

class RoomObjectsApi
{

    static ATTACK_STEP_MS = 500;

    static async fetchRoomObjects(gameConfig, roomName)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/room-objects?roomName='+encodeURIComponent(roomName)
        )).objects;
    }

    static async disableEnemies(gameConfig, roomName, onlyAggressive = false, exceptBodyKey = '')
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/disable-enemies',
            {roomName, onlyAggressive, exceptBodyKey}
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

    static async startEnemyBattle(gameConfig, roomName, playerName, enemyKey)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/enemy-battle',
            {roomName, playerName, enemyKey}
        );
    }

    static async placeAndTargetEnemy(page, gameConfig, roomName, enemyKey, enemyLife, timeout, holdAggression = false)
    {
        let placement = await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/room-objects/place-enemy',
            {
                roomName,
                enemyKey,
                enemyLife,
                holdAggression,
                sessionId: await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)
            }
        );
        if(!placement.position){
            return placement;
        }
        placement.targeted = await RoomObjectsApi.targetBodyAtPosition(
            page,
            placement.bodyKey,
            placement.position,
            timeout
        ).catch(() => false);
        if(!placement.targeted){
            placement.serverBody = await RoomMovementApi.fetchObject(gameConfig, roomName, placement.enemyKey);
            placement.clientBody = await page.evaluate(
                (bodyKey) => window.reldens.activeRoomEvents.room.state.bodies.get(bodyKey)?.toJSON() || false,
                placement.bodyKey
            );
        }
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

    static async attackTargetUntil(page, skillKey, isReached, timeout)
    {
        for(let step = 0; step < Math.ceil(timeout / RoomObjectsApi.ATTACK_STEP_MS); step++){
            if(await isReached()){
                return true;
            }
            await page.click(Selectors.combat.skillButton(skillKey), {force: true});
            await page.waitForTimeout(RoomObjectsApi.ATTACK_STEP_MS);
        }
        return await isReached();
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
            if(args.x !== player.state.x || args.y !== player.state.y){
                return false;
            }
            let playerEngine = window.reldens.getActiveScene()?.player;
            let playerSprite = playerEngine?.players?.[room.sessionId];
            if(!playerSprite){
                return false;
            }
            return args.x - playerEngine.leftOff === playerSprite.x && args.y - playerEngine.topOff === playerSprite.y;
        }, {x: position.x, y: position.y}, {timeout})).jsonValue();
    }

    static async placePlayerNextToObject(page, gameConfig, roomName, objectKey, timeout, minimumTilesDistance = 0)
    {
        return await RoomObjectsApi.requestPlayerPlacement(
            page,
            gameConfig,
            '/api/e2e/room-objects/place-player-next-to-object',
            {roomName, objectKey, minimumTilesDistance},
            timeout
        );
    }

    static async placePlayerInLineOfObject(page, gameConfig, roomName, objectKey, timeout, distances)
    {
        return await RoomObjectsApi.requestPlayerPlacement(
            page,
            gameConfig,
            '/api/e2e/room-objects/place-player-in-line-of-object',
            {roomName, objectKey, distances: distances.join(',')},
            timeout
        );
    }

    static async placePlayerForAggression(page, gameConfig, roomName, bodyKey, placement, timeout)
    {
        return await RoomObjectsApi.requestPlayerPlacement(
            page,
            gameConfig,
            '/api/e2e/room-objects/place-player-for-aggression',
            {roomName, bodyKey, ...placement},
            timeout
        );
    }

    static async placePlayerInRespawnArea(page, gameConfig, roomName, bodyKey, radius, timeout)
    {
        return await RoomObjectsApi.requestPlayerPlacement(
            page,
            gameConfig,
            '/api/e2e/room-objects/place-player-in-respawn-area',
            {roomName, bodyKey, radius},
            timeout
        );
    }

    static async placePlayersAcrossWall(page, gameConfig, roomName, targetSessionId, timeout)
    {
        return await RoomObjectsApi.requestPlayerPlacement(
            page,
            gameConfig,
            '/api/e2e/room-objects/place-players-across-wall',
            {roomName, targetSessionId},
            timeout
        );
    }

    static async placePlayerOnChangePoint(page, gameConfig, roomName, nextRoomName)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/room-objects/place-player-on-change-point', {
            roomName,
            nextRoomName,
            sessionId: await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)
        });
    }

    static async placeEnemiesOnLine(page, gameConfig, roomName, bodyKeys, tilesStep, direction, timeout)
    {
        let line = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/room-objects/place-enemies-on-line', {
            roomName,
            bodyKeys,
            tilesStep,
            direction,
            sessionId: await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)
        });
        if(line.playerPosition){
            line.reached = await RoomObjectsApi.waitForPlayerAtPosition(page, line.playerPosition, timeout);
        }
        return line;
    }

    static async requestPlayerPlacement(page, gameConfig, path, placementData, timeout)
    {
        let placement = await SecurityApi.request(gameConfig, 'POST', path, {
            ...placementData,
            sessionId: await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId)
        });
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
