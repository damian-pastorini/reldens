/**
 *
 * Reldens - Movement Scenario
 *
 * Shared setup and checks of the player and object movement specs: the town player login and the scenario context
 * (room, player, the e2eNpcKey object, the navigation timeout and the server snapshot readers), the pointer move of the
 * player to a tile with the server trail until it stands still on it, and the blocked tiles found in a trail, so every
 * movement spec reads the same server data the same way. The town NPCs and traders get their random movement stopped
 * and are placed back on their spawn tiles, so every case starts with the same room layout.
 *
 */

const { BaseE2eTest } = require('../base-e2e-test');
const { Login } = require('./login');
const { Navigation } = require('./navigation');
const { RoomMovementApi } = require('./room-movement-api');
const { WalkableTileLocator } = require('./walkable-tile-locator');
const { TimeConstants } = require('./time-constants');

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
        return {
            gameConfig,
            roomName,
            playerName,
            npcKey,
            navTimeout: TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun),
            fetchPlayer: async () => RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
            fetchNpc: async () => RoomMovementApi.fetchObject(gameConfig, roomName, npcKey),
            fetchTiles: async (tile, radius) => RoomMovementApi.fetchTiles(gameConfig, roomName, tile, radius),
            isStill: (snapshot) => 0 === snapshot.pathSteps && 0 === snapshot.velocityX && 0 === snapshot.velocityY
        };
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
