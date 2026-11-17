/**
 *
 * Reldens - Test Auto Recovery Enemies
 *
 * Tests the enemies auto recovery rules with a 1 second tick and a 3 seconds start delay for the group (the fast cases
 * of AutoRecoverySteps): the player enters the forest, two passive forest enemies (of a passive respawn area of the
 * stored room data) are kept and every other enemy is disabled, the enemy life is lowered out of battle and read from
 * the live room every 100ms: with the enemies recovery off it never recovers; the first tick after the delay adds
 * exactly the configured amount; the enemy "autoRecovery" private param overrides the amount or disables the recovery;
 * an enemy that is not active (dead or respawning) or that has no recovery state is skipped while the other enemy
 * still recovers; with onlyOutOfBattle on an enemy in battle (the player added to its battle players for the group)
 * does not recover and its delay counts from the battle end; and with a 5 seconds delay a life lowered again during
 * the delay restarts it.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryEnemies
{

    static OBJECTS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS;
    static LOW_LIFE = 1;
    static QUIET_TICKS = 3;
    static POLL_MS = 100;
    static OWN_AMOUNT = 5;
    static LONG_START_DELAY_MS = 5000;

    static async startCase(context, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemies.OBJECTS_PATH),
            configValues
        ));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        return await AutoRecoverySteps.keepPassiveEnemies(context.gameConfig, 2);
    }

    static async lowerLife(context, bodyKey, life)
    {
        let lowered = await GameplayE2eStateApi.setEnemyBodyLife(context.gameConfig, Login.FOREST_ROOM_NAME, bodyKey, life);
        expect(lowered.life, 'The enemy life must be lowered: '+lowered.error).toBe(life);
        return lowered;
    }

    static async fetchLife(context, bodyKey)
    {
        return (await GameplayE2eStateApi.fetchEnemyLife(context.gameConfig, Login.FOREST_ROOM_NAME, bodyKey)).life;
    }

    static recoveryWindowMs()
    {
        return AutoRecoverySteps.FAST_START_DELAY_MS + TestAutoRecoveryEnemies.QUIET_TICKS * AutoRecoverySteps.FAST_TICK_MS;
    }

    static async expectLifeKept(context, bodyKey, life, waitMs, message)
    {
        await context.page.waitForTimeout(waitMs);
        expect(await TestAutoRecoveryEnemies.fetchLife(context, bodyKey), message).toBe(life);
    }

    static async waitForLifeChange(context, bodyKey, fromLife, timeout, message)
    {
        await expect.poll(
            async () => await TestAutoRecoveryEnemies.fetchLife(context, bodyKey),
            {message, timeout, intervals: [TestAutoRecoveryEnemies.POLL_MS]}
        ).not.toBe(fromLife);
        return await TestAutoRecoveryEnemies.fetchLife(context, bodyKey);
    }

    static async changeEnemy(context, bodyKey, properties, isBattle)
    {
        let changed = await GameplayE2eStateApi.changeEnemyBattle(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            bodyKey,
            properties,
            isBattle
        );
        expect(changed.changed, 'The enemy properties must change: '+changed.error).toEqual(Object.keys(properties));
    }

    static async fetchStoredAmount(context)
    {
        return Number(await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            TestAutoRecoveryEnemies.OBJECTS_PATH+'/properties/hp'
        ));
    }

    static async runRecoveryOffTest(context)
    {
        let [bodyKey] = await TestAutoRecoveryEnemies.startCase(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemies.OBJECTS_PATH, false)
        );
        await TestAutoRecoveryEnemies.lowerLife(context, bodyKey, TestAutoRecoveryEnemies.LOW_LIFE);
        await TestAutoRecoveryEnemies.expectLifeKept(
            context,
            bodyKey,
            TestAutoRecoveryEnemies.LOW_LIFE,
            TestAutoRecoveryEnemies.recoveryWindowMs(),
            'The enemy never recovers with the enemies recovery off'
        );
    }

    static async runFirstAmountTest(context, enemyChange, expectedAmount)
    {
        let [bodyKey] = await TestAutoRecoveryEnemies.startCase(context);
        await enemyChange(bodyKey);
        await TestAutoRecoveryEnemies.lowerLife(context, bodyKey, TestAutoRecoveryEnemies.LOW_LIFE);
        expect(
            await TestAutoRecoveryEnemies.waitForLifeChange(
                context,
                bodyKey,
                TestAutoRecoveryEnemies.LOW_LIFE,
                TestAutoRecoveryEnemies.recoveryWindowMs(),
                'The enemy must recover'
            ),
            'The first recovery adds exactly the amount'
        ).toBe(TestAutoRecoveryEnemies.LOW_LIFE + await expectedAmount());
    }

    static async runSkippedEnemyTest(context, enemyChange, message)
    {
        let bodyKeys = await TestAutoRecoveryEnemies.startCase(context);
        for(let bodyKey of bodyKeys){
            await TestAutoRecoveryEnemies.lowerLife(context, bodyKey, TestAutoRecoveryEnemies.LOW_LIFE);
        }
        await enemyChange(bodyKeys[0]);
        await TestAutoRecoveryEnemies.waitForLifeChange(
            context,
            bodyKeys[1],
            TestAutoRecoveryEnemies.LOW_LIFE,
            TestAutoRecoveryEnemies.recoveryWindowMs(),
            'The other enemy still recovers'
        );
        await TestAutoRecoveryEnemies.expectLifeKept(
            context,
            bodyKeys[0],
            TestAutoRecoveryEnemies.LOW_LIFE,
            AutoRecoverySteps.FAST_TICK_MS,
            message
        );
    }

    static async runInBattleTest(context)
    {
        let [bodyKey] = await TestAutoRecoveryEnemies.startCase(
            context,
            {[TestAutoRecoveryEnemies.OBJECTS_PATH+'/onlyOutOfBattle']: true}
        );
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(
            context.gameConfig,
            'players',
            {name: context.gameConfig.e2ePlayerName}
        );
        await TestAutoRecoveryEnemies.lowerLife(context, bodyKey, TestAutoRecoveryEnemies.LOW_LIFE);
        await TestAutoRecoveryEnemies.changeEnemy(context, bodyKey, {inBattleWithPlayers: {[playerId]: true}}, true);
        await TestAutoRecoveryEnemies.expectLifeKept(
            context,
            bodyKey,
            TestAutoRecoveryEnemies.LOW_LIFE,
            TestAutoRecoveryEnemies.recoveryWindowMs(),
            'The enemy in battle does not recover'
        );
        await TestAutoRecoveryEnemies.changeEnemy(context, bodyKey, {inBattleWithPlayers: {}}, true);
        await TestAutoRecoveryEnemies.expectLifeKept(
            context,
            bodyKey,
            TestAutoRecoveryEnemies.LOW_LIFE,
            AutoRecoverySteps.FAST_START_DELAY_MS - 1000,
            'The enemy delay counts from the battle end'
        );
        await TestAutoRecoveryEnemies.waitForLifeChange(
            context,
            bodyKey,
            TestAutoRecoveryEnemies.LOW_LIFE,
            TestAutoRecoveryEnemies.recoveryWindowMs(),
            'The enemy recovers after the delay since the battle end'
        );
    }

    static async runLoweredAgainTest(context)
    {
        let [bodyKey] = await TestAutoRecoveryEnemies.startCase(
            context,
            {[TestAutoRecoveryEnemies.OBJECTS_PATH+'/startDelayMs']: TestAutoRecoveryEnemies.LONG_START_DELAY_MS}
        );
        let firstLife = 10;
        let secondLife = 5;
        let loweredAt = Date.now();
        await TestAutoRecoveryEnemies.lowerLife(context, bodyKey, firstLife);
        await context.page.waitForTimeout(3 * AutoRecoverySteps.FAST_TICK_MS);
        await TestAutoRecoveryEnemies.lowerLife(context, bodyKey, secondLife);
        await context.page.waitForTimeout(Math.max(0, loweredAt + 7500 - Date.now()));
        expect(
            await TestAutoRecoveryEnemies.fetchLife(context, bodyKey),
            'The enemy life lowered again during the delay restarts it'
        ).toBe(secondLife);
        await TestAutoRecoveryEnemies.waitForLifeChange(
            context,
            bodyKey,
            secondLife,
            TestAutoRecoveryEnemies.LONG_START_DELAY_MS,
            'The enemy recovers once the restarted delay passed'
        );
    }

    static run()
    {
        test.describe('Auto Recovery Enemies', () => {
            test('enemies recovery off never recovers a lowered enemy', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemies.runRecoveryOffTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy first recovery adds exactly the configured amount', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryEnemies.runFirstAmountTest(
                    context,
                    async () => true,
                    async () => await TestAutoRecoveryEnemies.fetchStoredAmount(context)
                );
            });
            test('enemy autoRecovery private param amounts override the configured amount', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryEnemies.runFirstAmountTest(
                    context,
                    async (bodyKey) => await TestAutoRecoveryEnemies.changeEnemy(
                        context,
                        bodyKey,
                        {autoRecovery: {hp: TestAutoRecoveryEnemies.OWN_AMOUNT}},
                        false
                    ),
                    async () => TestAutoRecoveryEnemies.OWN_AMOUNT
                );
            });
            test('enemy autoRecovery private param false never recovers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryEnemies.runSkippedEnemyTest(
                    context,
                    async (bodyKey) => await TestAutoRecoveryEnemies.changeEnemy(context, bodyKey, {autoRecovery: false}, false),
                    'The enemy with autoRecovery false never recovers'
                );
            });
            test('dead or respawning enemy is not recovered', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryEnemies.runSkippedEnemyTest(
                    context,
                    async (bodyKey) => await GameplayE2eStateApi.setEnemyStats(
                        gameConfig,
                        Login.FOREST_ROOM_NAME,
                        bodyKey,
                        {},
                        GameConst.STATUS.DEATH
                    ),
                    'The dead enemy is not recovered'
                );
            });
            test('enemy without recovery state is skipped and the other enemy still recovers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryEnemies.runSkippedEnemyTest(
                    context,
                    async (bodyKey) => await TestAutoRecoveryEnemies.changeEnemy(
                        context,
                        bodyKey,
                        {autoRecoveryState: null},
                        false
                    ),
                    'The enemy without recovery state is skipped'
                );
            });
            test('enemy in battle does not recover and its delay counts from the battle end', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemies.runInBattleTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy lowered again during the delay restarts it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemies.runLoweredAgainTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAutoRecoveryEnemies.run();
