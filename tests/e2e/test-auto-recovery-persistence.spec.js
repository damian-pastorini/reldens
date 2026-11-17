/**
 *
 * Reldens - Test Auto Recovery Persistence
 *
 * Tests the stored stats and the recovery state of the players auto recovery with the fast cases of AutoRecoverySteps
 * (1 second tick, 3 seconds start delay, every enemy disabled, the stored amount of life points per tick): the stored
 * life (the players_stats row) follows the live life on every recovery with persistEveryTicks 1, every 3 recoveries
 * with persistEveryTicks 3 (the next save 3 recoveries after the previous one), and not before 12 recoveries with
 * persistEveryTicks 0 (the default); the life stored by a persist tick is the life of the next login; a life recovered
 * to full before the persist tick is stored by the leave; and the recovery state is new on a login again or a scene
 * change, so a life still lowered waits the full delay again from the first tick of the new session or room (the
 * town room is created on the change with the overridden tick time).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryPersistence
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static PERSIST_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS+'/persistEveryTicks';
    static LOW_LIFE = 1;
    static POLL_MS = 100;
    static RECOVERY_WAIT_MS = 8000;
    static BEFORE_DELAY_MS = 2000;

    static async startCase(context, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryPersistence.PLAYERS_PATH),
            configValues
        ));
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        return await TestAutoRecoveryPersistence.fetchPlayer(context, Login.FOREST_ROOM_NAME);
    }

    static async fetchPlayer(context, roomName)
    {
        return await GameplayE2eStateApi.fetchPlayer(context.gameConfig, roomName, context.gameConfig.e2ePlayerName);
    }

    static async fetchStoredLife(context)
    {
        return await ForestEnemyKill.fetchStoredLife(context.gameConfig, context.gameConfig.e2ePlayerName);
    }

    static async waitForLife(context, roomName, expectedLife, message)
    {
        await expect.poll(
            async () => (await TestAutoRecoveryPersistence.fetchPlayer(context, roomName)).life,
            {
                message,
                timeout: TestAutoRecoveryPersistence.RECOVERY_WAIT_MS,
                intervals: [TestAutoRecoveryPersistence.POLL_MS]
            }
        ).toBe(expectedLife);
    }

    static async lowerLife(context)
    {
        return await AutoRecoverySteps.lowerPlayerLife(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            TestAutoRecoveryPersistence.LOW_LIFE
        );
    }

    static async fetchAmount(context)
    {
        return Number(await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            TestAutoRecoveryPersistence.PLAYERS_PATH+'/properties/hp'
        ));
    }

    static async expectStoredLife(context, expectedLife, message)
    {
        await expect.poll(
            async () => await TestAutoRecoveryPersistence.fetchStoredLife(context),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expectedLife);
    }

    static async runPersistEveryTickTest(context)
    {
        await TestAutoRecoveryPersistence.startCase(context, {[TestAutoRecoveryPersistence.PERSIST_PATH]: 1});
        let amount = await TestAutoRecoveryPersistence.fetchAmount(context);
        await TestAutoRecoveryPersistence.lowerLife(context);
        for(let ticks = 1; ticks <= 2; ticks++){
            let recoveredLife = TestAutoRecoveryPersistence.LOW_LIFE + ticks * amount;
            await TestAutoRecoveryPersistence.waitForLife(context, Login.FOREST_ROOM_NAME, recoveredLife, 'Recovery '+ticks);
            await TestAutoRecoveryPersistence.expectStoredLife(context, recoveredLife, 'Every recovery is stored');
        }
    }

    static async runPersistEveryThreeTicksTest(context)
    {
        let persistTicks = 3;
        await TestAutoRecoveryPersistence.startCase(context, {[TestAutoRecoveryPersistence.PERSIST_PATH]: persistTicks});
        let amount = await TestAutoRecoveryPersistence.fetchAmount(context);
        await TestAutoRecoveryPersistence.lowerLife(context);
        let storedLives = [];
        for(let ticks = 1; ticks <= 2 * persistTicks; ticks++){
            await TestAutoRecoveryPersistence.waitForLife(
                context,
                Login.FOREST_ROOM_NAME,
                TestAutoRecoveryPersistence.LOW_LIFE + ticks * amount,
                'Recovery '+ticks
            );
            storedLives.push(await TestAutoRecoveryPersistence.fetchStoredLife(context));
        }
        let firstPersistLife = TestAutoRecoveryPersistence.LOW_LIFE + persistTicks * amount;
        let secondPersistLife = TestAutoRecoveryPersistence.LOW_LIFE + 2 * persistTicks * amount;
        expect(storedLives.slice(persistTicks - 1), 'The stored life changes every 3 recoveries').toEqual(
            [firstPersistLife, firstPersistLife, firstPersistLife, secondPersistLife]
        );
    }

    static async runDefaultPersistTicksTest(context)
    {
        await TestAutoRecoveryPersistence.startCase(context, {[TestAutoRecoveryPersistence.PERSIST_PATH]: 0});
        let amount = await TestAutoRecoveryPersistence.fetchAmount(context);
        await TestAutoRecoveryPersistence.lowerLife(context);
        await TestAutoRecoveryPersistence.expectStoredLife(
            context,
            TestAutoRecoveryPersistence.LOW_LIFE,
            'The lowered life is stored'
        );
        await TestAutoRecoveryPersistence.waitForLife(
            context,
            Login.FOREST_ROOM_NAME,
            TestAutoRecoveryPersistence.LOW_LIFE + 3 * amount,
            'Three recoveries'
        );
        expect(
            await TestAutoRecoveryPersistence.fetchStoredLife(context),
            'persistEveryTicks 0 uses the default of 12, so 3 recoveries store nothing'
        ).toBe(TestAutoRecoveryPersistence.LOW_LIFE);
    }

    static async runPersistedLifeLoginTest(context)
    {
        let persistTicks = 2;
        await TestAutoRecoveryPersistence.startCase(context, {[TestAutoRecoveryPersistence.PERSIST_PATH]: persistTicks});
        let amount = await TestAutoRecoveryPersistence.fetchAmount(context);
        await TestAutoRecoveryPersistence.lowerLife(context);
        let persistedLife = TestAutoRecoveryPersistence.LOW_LIFE + persistTicks * amount;
        await TestAutoRecoveryPersistence.waitForLife(context, Login.FOREST_ROOM_NAME, persistedLife, 'Persist tick');
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestAutoRecoveryPersistence.PLAYERS_PATH+'/enabled',
            false
        );
        await TestAutoRecoveryPersistence.expectStoredLife(context, persistedLife, 'The persist tick stores the life');
        await context.page.goto('about:blank');
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        expect(
            (await TestAutoRecoveryPersistence.fetchPlayer(context, Login.FOREST_ROOM_NAME)).life,
            'The next login starts with the stored life'
        ).toBe(persistedLife);
    }

    static async runFullBeforePersistLeaveTest(context)
    {
        let player = await TestAutoRecoveryPersistence.startCase(context);
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestAutoRecoveryPersistence.PLAYERS_PATH+'/properties/hp',
            player.totalLife
        );
        await TestAutoRecoveryPersistence.lowerLife(context);
        await TestAutoRecoveryPersistence.waitForLife(context, Login.FOREST_ROOM_NAME, player.totalLife, 'Full life');
        await context.page.goto('about:blank');
        await TestAutoRecoveryPersistence.expectStoredLife(
            context,
            player.totalLife,
            'The leave stores the full life recovered before the persist tick'
        );
    }

    static async expectFullDelayAgain(context, roomName)
    {
        let rejoinedAt = Date.now();
        await context.page.waitForTimeout(TestAutoRecoveryPersistence.BEFORE_DELAY_MS);
        expect(
            (await TestAutoRecoveryPersistence.fetchPlayer(context, roomName)).life,
            'The new recovery state waits the full delay again'
        ).toBe(TestAutoRecoveryPersistence.LOW_LIFE);
        expect(Date.now() - rejoinedAt, 'The check runs before the start delay').toBeLessThan(
            AutoRecoverySteps.FAST_START_DELAY_MS
        );
        await expect.poll(
            async () => (await TestAutoRecoveryPersistence.fetchPlayer(context, roomName)).life,
            {message: 'The life recovers after the delay', timeout: TestAutoRecoveryPersistence.RECOVERY_WAIT_MS}
        ).toBeGreaterThan(TestAutoRecoveryPersistence.LOW_LIFE);
    }

    static async runLoginAgainTest(context)
    {
        await TestAutoRecoveryPersistence.startCase(context);
        await TestAutoRecoveryPersistence.lowerLife(context);
        await context.page.goto('about:blank');
        await TestAutoRecoveryPersistence.expectStoredLife(
            context,
            TestAutoRecoveryPersistence.LOW_LIFE,
            'The leave stores the lowered life'
        );
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await TestAutoRecoveryPersistence.expectFullDelayAgain(context, Login.FOREST_ROOM_NAME);
    }

    static async runSceneChangeTest(context)
    {
        await TestAutoRecoveryPersistence.startCase(context);
        await TestAutoRecoveryPersistence.lowerLife(context);
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        await TestAutoRecoveryPersistence.expectFullDelayAgain(context, Login.TOWN_ROOM_NAME);
    }

    static run()
    {
        test.describe('Auto Recovery Persistence', () => {
            test('persistEveryTicks 1 stores the life on every recovery', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPersistence.runPersistEveryTickTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('persistEveryTicks 3 stores the life every 3 recoveries', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPersistence.runPersistEveryThreeTicksTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('persistEveryTicks 0 uses the default of 12 recoveries', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPersistence.runDefaultPersistTicksTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('life stored by a persist tick is the life of the next login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPersistence.runPersistedLifeLoginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('life recovered to full before the persist tick is stored by the leave', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPersistence.runFullBeforePersistLeaveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('player that logs in again below its base life waits the full delay again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPersistence.runLoginAgainTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player lowered in the forest that enters the town waits the full delay and recovers there', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPersistence.runSceneChangeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAutoRecoveryPersistence.run();
