/**
 *
 * Reldens - Test Auto Recovery Players
 *
 * Tests the players auto recovery rules with a 1 second tick and a 3 seconds start delay for the group (the fast cases
 * of AutoRecoverySteps, every enemy disabled, the stored amount of life points per tick unless a case overrides it; the
 * life is read from the live server player every 100ms): with the players recovery off a lowered life never recovers;
 * the first tick after the delay adds exactly the configured amount and the next ticks add it again, at least a tick
 * apart; the recovery stops at the base life; a player at full life gets no stats message; with a 5 seconds delay a
 * life lowered again during the delay restarts it while a heal during the delay does not; a life recovered to full and
 * lowered again waits the full delay again; a start delay of 0 recovers on the next tick; and a dead, a disabled or a
 * scene changing player never recovers.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryPlayers
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static LOW_LIFE = 1;
    static QUIET_TICKS = 3;
    static POLL_MS = 100;
    static TICK_TOLERANCE_MS = 150;
    static LONG_START_DELAY_MS = 5000;
    static LOWERED_AGAIN_CHECK_MS = 7500;
    static AMOUNT_TO_MAX = 5;

    static async startCase(context, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryPlayers.PLAYERS_PATH),
            configValues
        ));
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        return await TestAutoRecoveryPlayers.fetchPlayer(context);
    }

    static async fetchPlayer(context)
    {
        return await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName
        );
    }

    static async fetchLife(context)
    {
        return (await TestAutoRecoveryPlayers.fetchPlayer(context)).life;
    }

    static async lowerLife(context, life)
    {
        return await AutoRecoverySteps.lowerPlayerLife(context.gameConfig, context.gameConfig.e2ePlayerName, life);
    }

    static async fetchStoredAmount(gameConfig)
    {
        return Number(await E2eSeedAndRestoreApi.fetchConfigValue(
            gameConfig,
            TestAutoRecoveryPlayers.PLAYERS_PATH+'/properties/hp'
        ));
    }

    static async waitForLifeChange(context, fromLife, timeout, message)
    {
        let deadline = Date.now() + timeout;
        while(Date.now() < deadline){
            let life = await TestAutoRecoveryPlayers.fetchLife(context);
            if(fromLife !== life){
                return {life, changedAt: Date.now()};
            }
            await context.page.waitForTimeout(TestAutoRecoveryPlayers.POLL_MS);
        }
        let lastLife = await TestAutoRecoveryPlayers.fetchLife(context);
        expect(lastLife, message).not.toBe(fromLife);
        return {life: lastLife, changedAt: Date.now()};
    }

    static async expectLifeKept(context, life, waitMs, message)
    {
        await context.page.waitForTimeout(waitMs);
        expect(await TestAutoRecoveryPlayers.fetchLife(context), message).toBe(life);
    }

    static recoveryWindowMs()
    {
        return AutoRecoverySteps.FAST_START_DELAY_MS + TestAutoRecoveryPlayers.QUIET_TICKS * AutoRecoverySteps.FAST_TICK_MS;
    }

    static async runRecoveryOffTest(context)
    {
        await TestAutoRecoveryPlayers.startCase(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryPlayers.PLAYERS_PATH, false)
        );
        await TestAutoRecoveryPlayers.lowerLife(context, TestAutoRecoveryPlayers.LOW_LIFE);
        await TestAutoRecoveryPlayers.expectLifeKept(
            context,
            TestAutoRecoveryPlayers.LOW_LIFE,
            TestAutoRecoveryPlayers.recoveryWindowMs(),
            'The lowered life never recovers with the players recovery off'
        );
    }

    static async runTickAmountsTest(context)
    {
        await TestAutoRecoveryPlayers.startCase(context);
        let amount = await TestAutoRecoveryPlayers.fetchStoredAmount(context.gameConfig);
        await TestAutoRecoveryPlayers.lowerLife(context, TestAutoRecoveryPlayers.LOW_LIFE);
        let changes = [];
        let lastLife = TestAutoRecoveryPlayers.LOW_LIFE;
        for(let i = 0; i < TestAutoRecoveryPlayers.QUIET_TICKS; i++){
            let change = await TestAutoRecoveryPlayers.waitForLifeChange(
                context,
                lastLife,
                TestAutoRecoveryPlayers.recoveryWindowMs(),
                'The life must recover on tick '+(i + 1)
            );
            changes.push(change);
            lastLife = change.life;
        }
        expect(changes.map(change => change.life), 'Each tick adds exactly the configured amount').toEqual(
            [1, 2, 3].map(ticks => TestAutoRecoveryPlayers.LOW_LIFE + ticks * amount)
        );
        for(let i = 1; i < changes.length; i++){
            expect(
                changes[i].changedAt - changes[i - 1].changedAt,
                'Two increases are at least a tick apart'
            ).toBeGreaterThanOrEqual(AutoRecoverySteps.FAST_TICK_MS - TestAutoRecoveryPlayers.TICK_TOLERANCE_MS);
        }
    }

    static async runStopsAtMaxTest(context)
    {
        let player = await TestAutoRecoveryPlayers.startCase(
            context,
            {[TestAutoRecoveryPlayers.PLAYERS_PATH+'/properties/hp']: TestAutoRecoveryPlayers.AMOUNT_TO_MAX}
        );
        await TestAutoRecoveryPlayers.lowerLife(context, player.totalLife - 1);
        let change = await TestAutoRecoveryPlayers.waitForLifeChange(
            context,
            player.totalLife - 1,
            TestAutoRecoveryPlayers.recoveryWindowMs(),
            'The life must recover'
        );
        expect(change.life, 'The recovery stops at the base life').toBe(player.totalLife);
        await TestAutoRecoveryPlayers.expectLifeKept(
            context,
            player.totalLife,
            TestAutoRecoveryPlayers.QUIET_TICKS * AutoRecoverySteps.FAST_TICK_MS,
            'The life never passes the base life'
        );
    }

    static async runFullLifeNoStatsTest(context)
    {
        let player = await TestAutoRecoveryPlayers.startCase(context);
        expect(player.life, 'The player starts with its full life').toBe(player.totalLife);
        await RoomMessagesRecorder.start(context.page);
        await context.page.waitForTimeout(TestAutoRecoveryPlayers.recoveryWindowMs());
        expect(
            await RoomMessagesRecorder.fetchMessages(context.page, GameConst.PLAYER_STATS),
            'A player at full life gets no stats message from the recovery'
        ).toEqual([]);
        expect(await TestAutoRecoveryPlayers.fetchLife(context), 'The full life is unchanged').toBe(player.totalLife);
    }

    static async runLoweredAgainTest(context)
    {
        await TestAutoRecoveryPlayers.startCase(
            context,
            {[TestAutoRecoveryPlayers.PLAYERS_PATH+'/startDelayMs']: TestAutoRecoveryPlayers.LONG_START_DELAY_MS}
        );
        let firstLife = 10;
        let secondLife = 5;
        let loweredAt = await TestAutoRecoveryPlayers.lowerLife(context, firstLife);
        await context.page.waitForTimeout(3 * AutoRecoverySteps.FAST_TICK_MS);
        await TestAutoRecoveryPlayers.lowerLife(context, secondLife);
        await context.page.waitForTimeout(
            Math.max(0, loweredAt + TestAutoRecoveryPlayers.LOWERED_AGAIN_CHECK_MS - Date.now())
        );
        expect(
            await TestAutoRecoveryPlayers.fetchLife(context),
            'The life lowered again during the delay restarts it'
        ).toBe(secondLife);
        await TestAutoRecoveryPlayers.waitForLifeChange(
            context,
            secondLife,
            TestAutoRecoveryPlayers.LONG_START_DELAY_MS,
            'The life recovers once the restarted delay passed'
        );
    }

    static async runHealDuringDelayTest(context)
    {
        await TestAutoRecoveryPlayers.startCase(
            context,
            {[TestAutoRecoveryPlayers.PLAYERS_PATH+'/startDelayMs']: TestAutoRecoveryPlayers.LONG_START_DELAY_MS}
        );
        let healedLife = 10;
        let loweredAt = await TestAutoRecoveryPlayers.lowerLife(context, TestAutoRecoveryPlayers.LOW_LIFE);
        await context.page.waitForTimeout(3 * AutoRecoverySteps.FAST_TICK_MS);
        await TestAutoRecoveryPlayers.lowerLife(context, healedLife);
        await context.page.waitForTimeout(
            Math.max(0, loweredAt + TestAutoRecoveryPlayers.LOWERED_AGAIN_CHECK_MS - Date.now())
        );
        expect(
            await TestAutoRecoveryPlayers.fetchLife(context),
            'The heal during the delay does not restart it'
        ).toBeGreaterThan(healedLife);
    }

    static async runFullThenLoweredTest(context)
    {
        let player = await TestAutoRecoveryPlayers.startCase(context);
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestAutoRecoveryPlayers.PLAYERS_PATH+'/properties/hp',
            player.totalLife
        );
        await TestAutoRecoveryPlayers.lowerLife(context, TestAutoRecoveryPlayers.LOW_LIFE);
        let recovered = await TestAutoRecoveryPlayers.waitForLifeChange(
            context,
            TestAutoRecoveryPlayers.LOW_LIFE,
            TestAutoRecoveryPlayers.recoveryWindowMs(),
            'The life must recover to full'
        );
        expect(recovered.life, 'One tick recovers the full life').toBe(player.totalLife);
        await TestAutoRecoveryPlayers.lowerLife(context, TestAutoRecoveryPlayers.LOW_LIFE);
        await TestAutoRecoveryPlayers.expectLifeKept(
            context,
            TestAutoRecoveryPlayers.LOW_LIFE,
            AutoRecoverySteps.FAST_START_DELAY_MS - 500,
            'The life lowered again waits the full delay again'
        );
        await TestAutoRecoveryPlayers.waitForLifeChange(
            context,
            TestAutoRecoveryPlayers.LOW_LIFE,
            TestAutoRecoveryPlayers.recoveryWindowMs(),
            'The life recovers after the full delay'
        );
    }

    static async runNoStartDelayTest(context)
    {
        await TestAutoRecoveryPlayers.startCase(context, {[TestAutoRecoveryPlayers.PLAYERS_PATH+'/startDelayMs']: 0});
        await TestAutoRecoveryPlayers.lowerLife(context, TestAutoRecoveryPlayers.LOW_LIFE);
        await TestAutoRecoveryPlayers.waitForLifeChange(
            context,
            TestAutoRecoveryPlayers.LOW_LIFE,
            AutoRecoverySteps.FAST_TICK_MS + 500,
            'With no start delay the life recovers on the next tick'
        );
    }

    static async runInactivePlayerTest(context, inactivate, message)
    {
        await TestAutoRecoveryPlayers.startCase(context);
        await TestAutoRecoveryPlayers.lowerLife(context, TestAutoRecoveryPlayers.LOW_LIFE);
        await inactivate();
        await TestAutoRecoveryPlayers.expectLifeKept(
            context,
            TestAutoRecoveryPlayers.LOW_LIFE,
            TestAutoRecoveryPlayers.recoveryWindowMs(),
            message
        );
    }

    static async setPlayerState(context, inState)
    {
        let changed = await GameplayE2eStateApi.setPlayerState(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            inState
        );
        expect(changed.inState, 'The player state must change').toBe(inState);
    }

    static run()
    {
        test.describe('Auto Recovery Players', () => {
            test('players recovery off never recovers a lowered life', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runRecoveryOffTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('each tick after the delay adds exactly the configured amount, at least a tick apart', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runTickAmountsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('recovery stops at the base life', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runStopsAtMaxTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player at full life gets no recovery stats message', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runFullLifeNoStatsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('life lowered again during the delay restarts it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runLoweredAgainTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('heal during the delay does not restart it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runHealDuringDelayTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('life recovered to full and lowered again waits the full delay again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runFullThenLoweredTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('start delay 0 recovers on the next tick', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayers.runNoStartDelayTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player never recovers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryPlayers.runInactivePlayerTest(
                    context,
                    async () => await TestAutoRecoveryPlayers.setPlayerState(context, GameConst.STATUS.DEATH),
                    'A dead player never recovers'
                );
            });
            test('disabled player never recovers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryPlayers.runInactivePlayerTest(
                    context,
                    async () => await TestAutoRecoveryPlayers.setPlayerState(context, GameConst.STATUS.DISABLED),
                    'A disabled player never recovers'
                );
            });
            test('player changing scene is skipped by the recovery', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryPlayers.runInactivePlayerTest(
                    context,
                    async () => await GameplayE2eStateApi.changePlayerBody(
                        gameConfig,
                        e2eGroup,
                        Login.FOREST_ROOM_NAME,
                        gameConfig.e2ePlayerName,
                        {isChangingScene: true}
                    ),
                    'A player changing scene never recovers'
                );
            });
        });
    }

}

TestAutoRecoveryPlayers.run();
