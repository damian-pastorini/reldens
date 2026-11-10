/**
 *
 * Reldens - Test Auto Recovery Enemy Bars
 *
 * Tests what the clients get while an enemy recovers, with the enemies recovery of the fast cases of AutoRecoverySteps
 * (1 second tick, 3 seconds start delay) and one passive forest enemy kept active (every other enemy disabled), its life
 * lowered out of battle: a second client in the forest receives the recovery life bar updates of that enemy; with the
 * stored life bar config (shown on click) the second client that does not target the enemy keeps its recovered life but
 * draws no bar; with the enemies bars off on the second client (its page config only) it ignores the updates; with the
 * bar on click off and the enemies bars on it draws the recovering enemy bar with no target; and a client that joins
 * the forest while the enemy is partly recovered (the recovery then turned off) gets its current life.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { LifeBarState } = require('./helpers/life-bar-state');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { UsersConst } = require('../../lib/users/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryEnemyBars
{

    static OBJECTS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS;
    static LOW_LIFE = 1;
    static POLL_MS = 100;
    static RECOVERY_WAIT_MS = 8000;

    static async startCase(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemyBars.OBJECTS_PATH)
        );
        await DeathObserverSteps.loginBothInForest(context);
        let [bodyKey] = await AutoRecoverySteps.keepPassiveEnemies(context.gameConfig, 1);
        return bodyKey;
    }

    static async lowerEnemy(context, bodyKey)
    {
        let lowered = await GameplayE2eStateApi.setEnemyBodyLife(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            bodyKey,
            TestAutoRecoveryEnemyBars.LOW_LIFE
        );
        expect(lowered.life, 'The enemy life must be lowered: '+lowered.error).toBe(TestAutoRecoveryEnemyBars.LOW_LIFE);
    }

    static async fetchEnemyLife(context, bodyKey)
    {
        return (await GameplayE2eStateApi.fetchEnemyLife(context.gameConfig, Login.FOREST_ROOM_NAME, bodyKey)).life;
    }

    static async waitForRecoveredEnemy(context, bodyKey)
    {
        await expect.poll(
            async () => await TestAutoRecoveryEnemyBars.fetchEnemyLife(context, bodyKey),
            {
                message: 'The enemy must recover',
                timeout: TestAutoRecoveryEnemyBars.RECOVERY_WAIT_MS,
                intervals: [TestAutoRecoveryEnemyBars.POLL_MS]
            }
        ).toBeGreaterThan(TestAutoRecoveryEnemyBars.LOW_LIFE);
        return await TestAutoRecoveryEnemyBars.fetchEnemyLife(context, bodyKey);
    }

    static async runBroadcastTest(context)
    {
        let bodyKey = await TestAutoRecoveryEnemyBars.startCase(context);
        await RoomMessagesRecorder.start(context.secondPage);
        await TestAutoRecoveryEnemyBars.lowerEnemy(context, bodyKey);
        let recoveredLife = await TestAutoRecoveryEnemyBars.waitForRecoveredEnemy(context, bodyKey);
        await expect.poll(
            async () => (await RoomMessagesRecorder.fetchMessages(
                context.secondPage,
                UsersConst.ACTION_LIFEBAR_UPDATE
            )).filter(
                message => bodyKey === message[ActionsConst.DATA_OWNER_KEY]
                    && ActionsConst.DATA_TYPE_VALUE_OBJECT === message[ActionsConst.DATA_OWNER_TYPE]
            ).map(message => message.newValue),
            {message: 'The second client receives the enemy recovery bar update', timeout: TimeConstants.SERVER_RESPONSE}
        ).toContain(recoveredLife);
    }

    static async runNoBarWithoutTargetTest(context)
    {
        let bodyKey = await TestAutoRecoveryEnemyBars.startCase(context);
        await TestAutoRecoveryEnemyBars.lowerEnemy(context, bodyKey);
        let recoveredLife = await TestAutoRecoveryEnemyBars.waitForRecoveredEnemy(context, bodyKey);
        await expect.poll(
            async () => (await LifeBarState.fetchObjectBar(context.secondPage, bodyKey)).value,
            {message: 'The second client keeps the recovered enemy life', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThanOrEqual(recoveredLife);
        expect(
            (await LifeBarState.fetchObjectBar(context.secondPage, bodyKey)).isDrawn,
            'The second client draws no bar for the enemy it does not target'
        ).toBe(false);
    }

    static async runEnemiesBarsOffTest(context)
    {
        let bodyKey = await TestAutoRecoveryEnemyBars.startCase(context);
        await LifeBarState.setPageConfig(context.secondPage, {showEnemies: false});
        let shownBefore = (await LifeBarState.fetchObjectBar(context.secondPage, bodyKey)).value;
        await TestAutoRecoveryEnemyBars.lowerEnemy(context, bodyKey);
        await TestAutoRecoveryEnemyBars.waitForRecoveredEnemy(context, bodyKey);
        await context.secondPage.waitForTimeout(AutoRecoverySteps.FAST_TICK_MS);
        expect(
            (await LifeBarState.fetchObjectBar(context.secondPage, bodyKey)).value,
            'The second client with the enemies bars off ignores the enemy updates'
        ).toBe(shownBefore);
    }

    static async runBarWithoutTargetTest(context)
    {
        let bodyKey = await TestAutoRecoveryEnemyBars.startCase(context);
        await LifeBarState.setPageConfig(context.secondPage, {showOnClick: false, showEnemies: true});
        await TestAutoRecoveryEnemyBars.lowerEnemy(context, bodyKey);
        let recoveredLife = await TestAutoRecoveryEnemyBars.waitForRecoveredEnemy(context, bodyKey);
        await expect.poll(
            async () => (await LifeBarState.fetchObjectBar(context.secondPage, bodyKey)).isDrawn,
            {message: 'The second client draws the recovering enemy bar with no target', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        expect(
            (await LifeBarState.fetchObjectBar(context.secondPage, bodyKey)).value,
            'The drawn bar shows the recovered life'
        ).toBeGreaterThanOrEqual(recoveredLife);
    }

    static async runJoinedClientTest(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemyBars.OBJECTS_PATH)
        );
        test.setTimeout(
            test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
        );
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let [bodyKey] = await AutoRecoverySteps.keepPassiveEnemies(context.gameConfig, 1);
        await TestAutoRecoveryEnemyBars.lowerEnemy(context, bodyKey);
        await TestAutoRecoveryEnemyBars.waitForRecoveredEnemy(context, bodyKey);
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestAutoRecoveryEnemyBars.OBJECTS_PATH+'/enabled',
            false
        );
        let partlyRecovered = await TestAutoRecoveryEnemyBars.fetchEnemyLife(context, bodyKey);
        await Login.loginAndEnterForest(
            context.secondPage,
            Login.fetchSecondPlayerConfig(context.gameConfig),
            context.longRun
        );
        await expect.poll(
            async () => (await LifeBarState.fetchObjectBar(context.secondPage, bodyKey)).value,
            {message: 'The joined client gets the partly recovered enemy life', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(partlyRecovered);
    }

    static run()
    {
        test.describe('Auto Recovery Enemy Bars', () => {
            test('second client receives the enemy recovery life bar updates', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyBars.runBroadcastTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('bar on click keeps the recovered enemy life but draws no bar without target', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyBars.runNoBarWithoutTargetTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('enemies bars off ignores the enemy recovery updates', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyBars.runEnemiesBarsOffTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('bar on click off draws the recovering enemy bar with no target', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyBars.runBarWithoutTargetTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('client joining while the enemy is partly recovered gets its current life', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyBars.runJoinedClientTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestAutoRecoveryEnemyBars.run();
