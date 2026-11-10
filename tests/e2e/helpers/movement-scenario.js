/**
 *
 * Reldens - Movement Scenario
 *
 * Shared setup and checks of the player and object movement specs: the town player login and the scenario context
 * (room, player, the e2eNpcKey object, the navigation timeout and the server snapshot readers), the pointer move of the
 * player to a tile with the server trail until it stands still on it, the walk to a tile on a line of tiles no room
 * body crosses (checked by the server) that returns the final server state of the stopped player, and the blocked
 * tiles found in a trail, so every movement spec reads the same server data the same way. The town NPCs and traders
 * get their random movement stopped
 * and are placed back on their spawn tiles, and then the player is placed on the room default return point (a
 * wandering NPC can push it away from it before the pause), so every case starts with the same room layout. The cases
 * in another room disable its enemies (but the one they use) and pause its moving NPCs the same way, so no wandering
 * body walks into the tiles they choose. The player can be placed again on the return point, next to the context NPC or
 * on a clear line of an enemy that gets targeted, and walked from the town into the forest through its change point
 * (with no canvas focus click in the long run, so its video records no stray click).
 *
 */

const { expect } = require('@playwright/test');
const { BaseE2eTest } = require('../base-e2e-test');
const { Login } = require('./login');
const { Navigation } = require('./navigation');
const { Phaser } = require('./phaser');
const { RoomMovementApi } = require('./room-movement-api');
const { RoomObjectsApi } = require('./room-objects-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { WalkableTileLocator } = require('./walkable-tile-locator');
const { TimeConstants } = require('./time-constants');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { GameConst } = require('../../../lib/game/constants');
const { sc } = require('@reldens/utils');

class MovementScenario
{

    static TEST_TIMEOUT_MS = 180000;
    static TILES_RADIUS = 8;
    static SETTLE_MS = 1500;
    static PATH_CHECK_MS = 600;
    static MOVING_OBJECTS_LISTS = ['npcs', 'traders'];

    static async start(page, gameConfig, longRun)
    {
        let roomName = Login.TOWN_ROOM_NAME;
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        let npcKey = gameConfig.e2eNpcKey || '';
        await Login.loginAndStartGame(
            page,
            gameConfig.e2eUsername2 || 'root2',
            gameConfig.e2ePassword2 || 'root',
            playerName,
            longRun
        );
        await Navigation.waitForRoom(page, roomName, TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun));
        await MovementScenario.pauseMovingObjects(gameConfig, roomName);
        let context = {
            ...MovementScenario.createWalkContext(gameConfig, roomName, playerName, longRun),
            npcKey,
            fetchNpc: async () => RoomMovementApi.fetchObject(gameConfig, roomName, npcKey),
            fetchTiles: async (tile, radius) => RoomMovementApi.fetchTiles(gameConfig, roomName, tile, radius)
        };
        await MovementScenario.placePlayerOnReturnPoint(page, context);
        return context;
    }

    static createWalkContext(gameConfig, roomName, playerName, longRun)
    {
        return {
            gameConfig,
            roomName,
            playerName,
            navTimeout: TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun),
            fetchPlayer: async () => RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
            isStill: (snapshot) => 0 === snapshot.pathSteps && 0 === snapshot.velocityX && 0 === snapshot.velocityY
        };
    }

    static async placePlayerOnReturnPoint(page, context)
    {
        let placement = await RoomObjectsApi.requestPlayerPlacement(
            page,
            context.gameConfig,
            '/api/e2e/movement/player-start',
            {roomName: context.roomName, playerName: context.playerName},
            context.navTimeout
        );
        expect(placement.reached, 'The player must start on the room return point: '+sc.toJsonString(placement))
            .toBe(true);
        return placement;
    }

    static async placePlayerNextToNpc(page, context, minimumTilesDistance)
    {
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            context.gameConfig,
            context.roomName,
            context.npcKey,
            context.navTimeout,
            minimumTilesDistance
        );
        expect(placement.reached, 'The player sprite must reach the placement: '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

    static async fetchPassiveEnemy(gameConfig, roomName)
    {
        let enemy = (await RoomObjectsApi.fetchRoomObjects(gameConfig, roomName)).find(
            snapshot => ObjectsConst.TYPE_ENEMY === snapshot.type
                && GameConst.STATUS.ACTIVE === snapshot.inState
                && !snapshot.isAggressive
        );
        expect(enemy, 'The room '+roomName+' must have an active passive enemy').toBeTruthy();
        return enemy;
    }

    static async placePlayerInLineAndTarget(page, gameConfig, roomName, enemyKey, timeout, distances)
    {
        let placement = await RoomObjectsApi.placePlayerInLineOfObject(
            page,
            gameConfig,
            roomName,
            enemyKey,
            timeout,
            distances
        );
        expect(
            placement.reached,
            'The player must be placed on a clear line of tiles from the enemy: '+sc.toJsonString(placement)
        ).toBe(true);
        let isTargeted = await RoomObjectsApi.targetBodyAtPosition(
            page,
            placement.bodyKey,
            placement.objectPosition,
            timeout
        );
        expect(isTargeted, 'The enemy must be targeted').toBe(true);
        return placement;
    }

    static async walkIntoTheForest(page, context, longRun)
    {
        await MovementScenario.walkBelowTheForestChangePoint(page, context, longRun);
        let isInForest = await Navigation.ensureInRoom(
            page,
            Login.FOREST_ROOM_NAME,
            Login.FOREST_TRANSITION_X,
            Login.FOREST_TRANSITION_Y,
            context.navTimeout,
            !longRun
        );
        expect(isInForest, 'The player must walk into the forest').toBe(true);
        await Phaser.waitForPlayerInRoomState(page, TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun));
        return await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
    }

    static async walkBelowTheForestFromReturnPoint(page, gameConfig, playerName, longRun)
    {
        let walkContext = MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, playerName, longRun);
        await MovementScenario.placePlayerOnReturnPoint(page, walkContext);
        await MovementScenario.walkBelowTheForestChangePoint(page, walkContext, longRun);
    }

    static async tryWalkIntoTheForest(page, longRun)
    {
        return await Navigation.ensureInRoom(
            page,
            Login.FOREST_ROOM_NAME,
            Login.FOREST_TRANSITION_X,
            Login.FOREST_TRANSITION_Y,
            TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        );
    }

    static async walkBelowTheForestChangePoint(page, context, longRun)
    {
        let townMovement = await MovementScenario.movePlayer(
            page,
            context,
            [
                Math.floor(Login.FOREST_TRANSITION_X / Navigation.TILE_SIZE),
                Math.floor(Login.FOREST_TRANSITION_Y / Navigation.TILE_SIZE) + 1
            ],
            TimeConstants.forLongRun(TimeConstants.MAP_CROSSING, longRun)
        );
        expect(townMovement.done, 'The player must reach the tile below the forest change point').toBe(true);
    }

    static async pauseMovingObjects(gameConfig, roomName)
    {
        for(let entry of BaseE2eTest.loadRoomEntries(roomName, MovementScenario.MOVING_OBJECTS_LISTS, true)){
            let pausedObject = await RoomMovementApi.switchRandomMovement(gameConfig, roomName, entry.clientKey, false);
            if(!pausedObject){
                continue;
            }
            await RoomMovementApi.placeObject(
                gameConfig,
                roomName,
                entry.clientKey,
                [pausedObject.originalCol, pausedObject.originalRow]
            );
        }
    }

    static async stopMovingBodies(gameConfig, roomName, exceptEnemyBodyKey = '')
    {
        await RoomObjectsApi.disableEnemies(gameConfig, roomName, false, exceptEnemyBodyKey);
        await MovementScenario.pauseMovingObjects(gameConfig, roomName);
    }

    static async movePlayer(page, context, tile, timeout)
    {
        let point = WalkableTileLocator.worldPoint(tile);
        await Navigation.moveToWorldPoint(page, point.x, point.y);
        return await RoomMovementApi.collectTrail(
            context.fetchPlayer,
            (player) => context.isStill(player) && tile[0] === player.currentCol && tile[1] === player.currentRow,
            timeout
        );
    }

    static async walkClearLine(page, context, roomName, playerName, distances)
    {
        let gameConfig = context.gameConfig;
        let walkContext = {
            fetchPlayer: async () => RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
            isStill: context.isStill
        };
        let walkTile = await RoomMovementApi.fetchClearLineTile(gameConfig, roomName, playerName, distances);
        expect(
            walkTile,
            'A clear line of tiles must start on '+playerName+': '+sc.toJsonString(await walkContext.fetchPlayer())
        ).toBeTruthy();
        let movement = await MovementScenario.movePlayer(page, walkContext, walkTile, context.navTimeout);
        expect(
            movement.done,
            playerName+' must walk to '+walkTile.join(',')+': '+sc.toJsonString(movement.last)
        ).toBe(true);
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, playerName);
    }

    static async collectFailures(cases, runCase)
    {
        let failures = [];
        for(let movementCase of cases){
            let failure = await runCase(movementCase);
            if(failure){
                failures.push(failure);
            }
        }
        return failures;
    }

    static async runReachableCases(cases, maxAttempts, requiredCases, runCase)
    {
        let results = {checkedCases: 0, failures: []};
        for(let movementCase of cases.slice(0, maxAttempts)){
            if(requiredCases <= results.checkedCases){
                break;
            }
            let result = await runCase(movementCase);
            if(result.skipped){
                continue;
            }
            results.checkedCases++;
            if(result.failure){
                results.failures.push(result.failure);
            }
        }
        return results;
    }

    static findBlockedTrailTiles(trail, tiles)
    {
        let blockedTiles = [];
        for(let snapshot of trail){
            if(!snapshot){
                continue;
            }
            let tile = [snapshot.currentCol, snapshot.currentRow];
            let kind = WalkableTileLocator.blockedKind(tiles, tile);
            if(kind){
                blockedTiles.push({tile, kind});
            }
        }
        return blockedTiles;
    }

}

module.exports.MovementScenario = MovementScenario;
