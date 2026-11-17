/**
 *
 * Reldens - Test Movement Return Points
 *
 * Tests the arrival of every room change through the change points of the sample rooms (exclusive group, the rooms,
 * change points and return points read from the stored rows by ChangePointsSteps, the player placed on each change point
 * tile body): every change point tile of both ways between two rooms leads to the next room and saves the player on
 * the next room return point of the previous room (or on the one without a previous room), for the town and the forest,
 * the town and its houses, the forest levels one to six, the first house floors, the second house gravity room and the
 * bots forest house. The bots forest is entered by its stored state, set before the login. With the town stats save
 * delayed, a player that walks from the town into the first house and straight back keeps the town stored after the
 * late leave of the town ends.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementReturnPoints
{

    static FIRST_HOUSE = 'reldens-house-1';
    static FIRST_HOUSE_FLOOR = 'reldens-house-1-2d-floor';
    static SECOND_HOUSE = 'reldens-house-2';
    static GRAVITY_ROOM = 'reldens-gravity';
    static BOTS_FOREST = 'reldens-bots-forest';
    static BOTS_HOUSE = 'reldens-bots-forest-house-01-n0';
    static LATE_SAVE_MS = 2000;

    static async runTour(context, buildChanges)
    {
        let topology = await ChangePointsSteps.loadTopology(context.gameConfig);
        let changes = buildChanges(topology);
        test.setTimeout(TimeConstants.GAME_START + changes.length * TimeConstants.ROOM_TRANSITION * 2);
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await ChangePointsSteps.runChanges(context, {page: context.page, playerName: context.gameConfig.e2ePlayerName}, topology, changes);
    }

    static buildHousesChanges(topology)
    {
        return Object.keys(topology.roomsIds).filter(
            roomName => Login.FOREST_ROOM_NAME !== roomName
                && 0 < ChangePointsSteps.fetchTiles(topology, Login.TOWN_ROOM_NAME, roomName).length
        ).flatMap(houseName => ChangePointsSteps.buildRoundTrips(topology, Login.TOWN_ROOM_NAME, houseName));
    }

    static buildForestLevelsChanges(topology, firstLevelIndex, lastLevelIndex)
    {
        let levels = Login.FOREST_LEVELS;
        let roundTrips = [];
        for(let levelIndex = firstLevelIndex; levelIndex < lastLevelIndex; levelIndex++){
            roundTrips.push(...ChangePointsSteps.buildRoundTrips(topology, levels[levelIndex], levels[levelIndex + 1]));
            roundTrips.push(...ChangePointsSteps.buildWalk(topology, [levels[levelIndex], levels[levelIndex + 1]]));
        }
        return [
            ...ChangePointsSteps.buildWalk(topology, [Login.TOWN_ROOM_NAME, ...levels.slice(0, firstLevelIndex + 1)]),
            ...roundTrips
        ];
    }

    static buildFloorsAndGravityChanges(topology)
    {
        return [
            ...ChangePointsSteps.buildWalk(topology, [Login.TOWN_ROOM_NAME, TestMovementReturnPoints.FIRST_HOUSE]),
            ...ChangePointsSteps.buildRoundTrips(
                topology,
                TestMovementReturnPoints.FIRST_HOUSE,
                TestMovementReturnPoints.FIRST_HOUSE_FLOOR
            ),
            ...ChangePointsSteps.buildWalk(
                topology,
                [TestMovementReturnPoints.FIRST_HOUSE, Login.TOWN_ROOM_NAME, TestMovementReturnPoints.SECOND_HOUSE]
            ),
            ...ChangePointsSteps.buildRoundTrips(
                topology,
                TestMovementReturnPoints.SECOND_HOUSE,
                TestMovementReturnPoints.GRAVITY_ROOM
            )
        ];
    }

    static async runLateLeaveSaveTest(context)
    {
        let topology = await ChangePointsSteps.loadTopology(context.gameConfig);
        let [toHouse, backToTown] = ChangePointsSteps.buildRoundTrips(
            topology,
            Login.TOWN_ROOM_NAME,
            TestMovementReturnPoints.FIRST_HOUSE
        );
        test.setTimeout(TimeConstants.GAME_START + 4 * TimeConstants.ROOM_TRANSITION + TestMovementReturnPoints.LATE_SAVE_MS);
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        let delayed = await GameplayE2eStateApi.delayRoomMethod(
            context.gameConfig,
            context.e2eGroup,
            Login.TOWN_ROOM_NAME,
            'savePlayerStats',
            TestMovementReturnPoints.LATE_SAVE_MS
        );
        expect(delayed.methodKey, 'The town stats save must be delayed: '+delayed.error).toBe('savePlayerStats');
        let player = {page: context.page, playerName: context.gameConfig.e2ePlayerName};
        await ChangePointsSteps.enterNextRoom(context, player, toHouse);
        await ChangePointsSteps.enterNextRoom(context, player, backToTown);
        await context.page.waitForTimeout(TestMovementReturnPoints.LATE_SAVE_MS + TimeConstants.ACTION);
        expect(
            ChangePointsSteps.mapPosition(await E2eSeedAndRestoreApi.fetchPlayerState(context.gameConfig, player.playerName)),
            'The late leave save of the town never stores the house over the town the player walked back to'
        ).toEqual(ChangePointsSteps.fetchArrival(topology, Login.TOWN_ROOM_NAME, TestMovementReturnPoints.FIRST_HOUSE));
    }

    static async runBotsForestTest(context)
    {
        await ChangePointsSteps.storeRoomArrival(
            context,
            await ChangePointsSteps.loadTopology(context.gameConfig),
            TestMovementReturnPoints.BOTS_FOREST
        );
        await TestMovementReturnPoints.runTour(
            context,
            (loadedTopology) => ChangePointsSteps.buildRoundTrips(
                loadedTopology,
                TestMovementReturnPoints.BOTS_FOREST,
                TestMovementReturnPoints.BOTS_HOUSE
            )
        );
    }

    static run()
    {
        test.describe('Movement Return Points', () => {
            test('every town and forest change point tile arrives on the return point of the previous room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementReturnPoints.runTour(
                    {page, gameConfig, e2eGroup, longRun},
                    (topology) => ChangePointsSteps.buildRoundTrips(topology, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME)
                );
            });
            test('every town and houses change point tile arrives on the return point of the previous room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementReturnPoints.runTour({page, gameConfig, e2eGroup, longRun}, TestMovementReturnPoints.buildHousesChanges);
            });
            test('every change point tile of the forest levels one to three arrives on the return point of the previous room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementReturnPoints.runTour(
                    {page, gameConfig, e2eGroup, longRun},
                    (topology) => TestMovementReturnPoints.buildForestLevelsChanges(topology, 0, 2)
                );
            });
            test('every change point tile of the forest levels three to six arrives on the return point of the previous room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementReturnPoints.runTour(
                    {page, gameConfig, e2eGroup, longRun},
                    (topology) => TestMovementReturnPoints.buildForestLevelsChanges(topology, 2, 5)
                );
            });
            test('every house floor and gravity room change point tile arrives on the return point of the previous room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementReturnPoints.runTour({page, gameConfig, e2eGroup, longRun}, TestMovementReturnPoints.buildFloorsAndGravityChanges);
            });
            test('walking straight back from a house keeps the town stored while the town leave save is late', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementReturnPoints.runLateLeaveSaveTest({page, gameConfig, e2eGroup, longRun});
            });
            test('every bots forest and bots house change point tile arrives on the return point of the previous room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementReturnPoints.runBotsForestTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementReturnPoints.run();
