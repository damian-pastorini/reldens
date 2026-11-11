/**
 *
 * Reldens - Test Player Speed
 *
 * Tests the player body speed taken from the player speed stat (the users plugin "usePlayerSpeedProperty", read from
 * the config once on start, changed on the live plugin for the group before the login) with the speed stat of the
 * player changed for the group: on, the body takes the stat value and the player walks a clear line of town tiles at
 * that velocity; off, the body keeps the player speed of the room world and walks at it while the stat holds another
 * value.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPlayerSpeed
{

    static SPEED_STAT_KEY = 'speed';
    static STAT_SPEED = 120;
    static USERS_FEATURE_PATH = 'users/package';
    static USE_SPEED_PROPERTY = 'usePlayerSpeedProperty';
    static WALK_DISTANCES = [4, 3, 2];

    static async enterTown(context, usePlayerSpeedProperty)
    {
        let gameConfig = context.gameConfig;
        let playerName = gameConfig.e2ePlayerName;
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'playersStats', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            stat_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'stats', {key: TestPlayerSpeed.SPEED_STAT_KEY})
        }, {value: TestPlayerSpeed.STAT_SPEED});
        let switched = await GameplayE2eStateApi.changeFeatureProperty(
            gameConfig,
            context.e2eGroup,
            TestPlayerSpeed.USERS_FEATURE_PATH,
            TestPlayerSpeed.USE_SPEED_PROPERTY,
            usePlayerSpeedProperty
        );
        expect(switched.value, 'The player speed switch must change: '+switched.error).toBe(usePlayerSpeedProperty);
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION * 2, context.longRun)
        );
        await Login.startConfigPlayer(context.page, gameConfig, context.longRun, Login.TOWN_ROOM_NAME);
        await Navigation.waitForRoom(
            context.page,
            Login.TOWN_ROOM_NAME,
            TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, context.longRun)
        );
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        expect(player.stats, 'The player stats must be read: '+player.error).toBeTruthy();
        expect(player.stats[TestPlayerSpeed.SPEED_STAT_KEY], 'The player speed stat').toBe(TestPlayerSpeed.STAT_SPEED);
        expect(player.worldPlayerSpeed, 'The room world player speed differs from the stat')
            .not.toBe(TestPlayerSpeed.STAT_SPEED);
        return player;
    }

    static async walkTopSpeed(context)
    {
        let gameConfig = context.gameConfig;
        let playerName = gameConfig.e2ePlayerName;
        await MovementScenario.pauseMovingObjects(gameConfig, Login.TOWN_ROOM_NAME);
        let walkContext = MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, playerName, context.longRun);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let walkTile = await RoomMovementApi.fetchClearLineTile(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            playerName,
            TestPlayerSpeed.WALK_DISTANCES
        );
        expect(walkTile, 'A clear line of tiles must start on the player').toBeTruthy();
        let movement = await MovementScenario.movePlayer(context.page, walkContext, walkTile, walkContext.navTimeout);
        expect(movement.done, 'The player must walk to '+walkTile.join(',')+': '+sc.toJsonString(movement.last)).toBe(true);
        return Math.max(...movement.trail.map(
            snapshot => Math.max(Math.abs(snapshot.velocityX), Math.abs(snapshot.velocityY))
        ));
    }

    static async runStatSpeedTest(context)
    {
        let player = await TestPlayerSpeed.enterTown(context, true);
        expect(player.movementSpeed, 'The body takes the speed stat').toBe(TestPlayerSpeed.STAT_SPEED);
        expect(await TestPlayerSpeed.walkTopSpeed(context), 'The player walks at the stat speed')
            .toBe(TestPlayerSpeed.STAT_SPEED);
    }

    static async runWorldSpeedTest(context)
    {
        let player = await TestPlayerSpeed.enterTown(context, false);
        expect(player.movementSpeed, 'The body keeps the world player speed').toBe(player.worldPlayerSpeed);
        expect(await TestPlayerSpeed.walkTopSpeed(context), 'The player walks at the world player speed')
            .toBe(player.worldPlayerSpeed);
    }

    static run()
    {
        test.describe('Player Speed', () => {
            test('speed property on: the body walks at the speed stat', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerSpeed.runStatSpeedTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('speed property off: the speed stat does not change the body speed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerSpeed.runWorldSpeedTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestPlayerSpeed.run();
