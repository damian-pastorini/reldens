/**
 *
 * Reldens - Test Auto Recovery Stats
 *
 * Tests the configured recovery amounts and the rooms of the auto recovery with the fast cases of AutoRecoverySteps
 * (1 second tick, 3 seconds start delay): the players recovery properties are replaced for the group, so with hp and mp
 * configured both lowered stats recover, a zero or not numeric amount and a negative amount never change the stat, an
 * unknown stat key next to hp adds nothing while hp recovers, and with only mp configured mp recovers while hp stays;
 * with a 5 seconds delay a stat lowered later waits its own delay; two players with different lowered lives recover
 * on their own; with the players recovery on and the enemies recovery off only the player recovers, and the other way
 * around only the enemy recovers (a passive enemy is kept in the forest); and players lowered in the forest and in the
 * town room (both rooms ticks restarted with the fast tick time) recover each in its own room.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { AutoRecoveryShowcase } = require('./helpers/auto-recovery-showcase');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryStats
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static OBJECTS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS;
    static PROPERTIES_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS+'/properties';
    static QUIET_TICKS = 3;
    static POLL_MS = 100;
    static LONG_START_DELAY_MS = 5000;
    static LATER_CHECK_MS = 7500;
    static SECOND_PLAYER_LIFE = 20;

    static async startCase(context, properties, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryStats.PLAYERS_PATH),
            {[TestAutoRecoveryStats.PROPERTIES_PATH]: properties},
            configValues
        ));
        await AutoRecoverySteps.enterForestWithFastTicks(context);
    }

    static async fetchPlayer(gameConfig, roomName = Login.FOREST_ROOM_NAME)
    {
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
    }

    static async lowerStats(gameConfig, stats, roomName = Login.FOREST_ROOM_NAME)
    {
        let lowered = await GameplayE2eStateApi.setPlayerStats(gameConfig, roomName, gameConfig.e2ePlayerName, stats);
        expect(lowered.stats, 'The player stats must be lowered: '+lowered.error).toEqual(expect.objectContaining(stats));
        return Date.now();
    }

    static recoveryWindowMs()
    {
        return AutoRecoverySteps.FAST_START_DELAY_MS + TestAutoRecoveryStats.QUIET_TICKS * AutoRecoverySteps.FAST_TICK_MS;
    }

    static async waitForStatAbove(gameConfig, statKey, value, message, roomName = Login.FOREST_ROOM_NAME)
    {
        await expect.poll(
            async () => (await TestAutoRecoveryStats.fetchPlayer(gameConfig, roomName)).stats[statKey],
            {message, timeout: TestAutoRecoveryStats.recoveryWindowMs(), intervals: [TestAutoRecoveryStats.POLL_MS]}
        ).toBeGreaterThan(value);
    }

    static async expectStatsKept(context, stats, message)
    {
        await context.page.waitForTimeout(TestAutoRecoveryStats.recoveryWindowMs());
        expect((await TestAutoRecoveryStats.fetchPlayer(context.gameConfig)).stats, message).toEqual(
            expect.objectContaining(stats)
        );
    }

    static async runSeveralKeysTest(context)
    {
        await TestAutoRecoveryStats.startCase(context, {hp: 1, mp: 1});
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, {hp: 1, mp: 1});
        await TestAutoRecoveryStats.waitForStatAbove(context.gameConfig, 'hp', 1, 'The hp recovers');
        await TestAutoRecoveryStats.waitForStatAbove(context.gameConfig, 'mp', 1, 'The mp recovers');
    }

    static async runInvalidAmountsTest(context, properties, message)
    {
        await TestAutoRecoveryStats.startCase(context, properties);
        let lowered = {};
        for(let statKey of Object.keys(properties)){
            lowered[statKey] = 10;
        }
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, lowered);
        await TestAutoRecoveryStats.expectStatsKept(context, lowered, message);
    }

    static async runUnknownKeyTest(context)
    {
        await TestAutoRecoveryStats.startCase(context, {hp: 1, unknownStat: 5});
        let statsKeys = Object.keys((await TestAutoRecoveryStats.fetchPlayer(context.gameConfig)).stats);
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, {hp: 1});
        await TestAutoRecoveryStats.waitForStatAbove(context.gameConfig, 'hp', 1, 'The hp still recovers');
        expect(
            Object.keys((await TestAutoRecoveryStats.fetchPlayer(context.gameConfig)).stats),
            'The unknown stat key adds nothing to the player stats'
        ).toEqual(statsKeys);
    }

    static async runOnlyMpTest(context)
    {
        await TestAutoRecoveryStats.startCase(context, {mp: 1});
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, {hp: 1, mp: 1});
        await TestAutoRecoveryStats.waitForStatAbove(context.gameConfig, 'mp', 1, 'The configured mp recovers');
        expect(
            (await TestAutoRecoveryStats.fetchPlayer(context.gameConfig)).stats.hp,
            'The not configured hp stays'
        ).toBe(1);
    }

    static async runOwnDelaysTest(context)
    {
        await TestAutoRecoveryStats.startCase(
            context,
            {hp: 1, mp: 1},
            {[TestAutoRecoveryStats.PLAYERS_PATH+'/startDelayMs']: TestAutoRecoveryStats.LONG_START_DELAY_MS}
        );
        let hpLoweredAt = await TestAutoRecoveryStats.lowerStats(context.gameConfig, {hp: 1});
        await context.page.waitForTimeout(3 * AutoRecoverySteps.FAST_TICK_MS);
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, {mp: 1});
        await context.page.waitForTimeout(
            Math.max(0, hpLoweredAt + TestAutoRecoveryStats.LATER_CHECK_MS - Date.now())
        );
        let stats = (await TestAutoRecoveryStats.fetchPlayer(context.gameConfig)).stats;
        expect(stats.hp, 'The hp lowered first recovers after its own delay').toBeGreaterThan(1);
        expect(stats.mp, 'The mp lowered later still waits its own delay').toBe(1);
        await TestAutoRecoveryStats.waitForStatAbove(context.gameConfig, 'mp', 1, 'The mp recovers after its own delay');
    }

    static async runTwoPlayersTest(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryStats.PLAYERS_PATH)
        );
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await AutoRecoverySteps.restartFastTicks(context);
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, {hp: 1});
        await TestAutoRecoveryStats.lowerStats(secondContext.gameConfig, {hp: TestAutoRecoveryStats.SECOND_PLAYER_LIFE});
        await TestAutoRecoveryStats.waitForStatAbove(context.gameConfig, 'hp', 1, 'The first player recovers');
        await TestAutoRecoveryStats.waitForStatAbove(
            secondContext.gameConfig,
            'hp',
            TestAutoRecoveryStats.SECOND_PLAYER_LIFE,
            'The second player recovers from its own life'
        );
        expect(
            (await TestAutoRecoveryStats.fetchPlayer(context.gameConfig)).stats.hp,
            'The first player recovers from its own life'
        ).toBeLessThan(TestAutoRecoveryStats.SECOND_PLAYER_LIFE);
    }

    static async runOnlyOneSideTest(context, playersEnabled)
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryStats.PLAYERS_PATH, playersEnabled),
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryStats.OBJECTS_PATH, !playersEnabled)
        ));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let [bodyKey] = await AutoRecoverySteps.keepPassiveEnemies(context.gameConfig, 1);
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, {hp: 1});
        let lowered = await GameplayE2eStateApi.setEnemyBodyLife(context.gameConfig, Login.FOREST_ROOM_NAME, bodyKey, 1);
        expect(lowered.life, 'The enemy life must be lowered: '+lowered.error).toBe(1);
        let fetchEnemyLife = async () => (await GameplayE2eStateApi.fetchEnemyLife(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            bodyKey
        )).life;
        let fetchPlayerLife = async () => (await TestAutoRecoveryStats.fetchPlayer(context.gameConfig)).stats.hp;
        await expect.poll(
            playersEnabled ? fetchPlayerLife : fetchEnemyLife,
            {message: 'The enabled side recovers', timeout: TestAutoRecoveryStats.recoveryWindowMs()}
        ).toBeGreaterThan(1);
        expect(await (playersEnabled ? fetchEnemyLife : fetchPlayerLife)(), 'The disabled side does not recover').toBe(1);
    }

    static async runTwoRoomsTest(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryStats.PLAYERS_PATH)
        );
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        let townConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await AutoRecoveryShowcase.requestTicksRestart(context.gameConfig, Login.TOWN_ROOM_NAME);
        await TestAutoRecoveryStats.lowerStats(context.gameConfig, {hp: 1});
        await TestAutoRecoveryStats.lowerStats(townConfig, {hp: 1}, Login.TOWN_ROOM_NAME);
        await TestAutoRecoveryStats.waitForStatAbove(context.gameConfig, 'hp', 1, 'The forest player recovers');
        await TestAutoRecoveryStats.waitForStatAbove(
            townConfig,
            'hp',
            1,
            'The town player recovers in its own room',
            Login.TOWN_ROOM_NAME
        );
    }

    static run()
    {
        test.describe('Auto Recovery Stats', () => {
            test('hp and mp configured recover both lowered stats', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runSeveralKeysTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('zero and not numeric amounts never change the stats', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runInvalidAmountsTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {hp: 0, mp: 'invalid'},
                    'A zero or not numeric amount never changes the stat'
                );
            });
            test('negative amount never reduces the life', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runInvalidAmountsTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {hp: -5},
                    'A negative amount never reduces the life'
                );
            });
            test('unknown stat key next to hp adds nothing while hp recovers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runUnknownKeyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('only mp configured recovers mp and keeps hp', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runOnlyMpTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('stat lowered later waits its own start delay', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runOwnDelaysTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two players with different lives recover on their own', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runTwoPlayersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('players recovery on and enemies recovery off recovers only the player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runOnlyOneSideTest({page, screenshots, gameConfig, e2eGroup, longRun}, true);
            });
            test('enemies recovery on and players recovery off recovers only the enemy', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runOnlyOneSideTest({page, screenshots, gameConfig, e2eGroup, longRun}, false);
            });
            test('players lowered in the forest and in the town room recover each in its room', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryStats.runTwoRoomsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAutoRecoveryStats.run();
