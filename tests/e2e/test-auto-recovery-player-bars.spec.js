/**
 *
 * Reldens - Test Auto Recovery Player Bars
 *
 * Tests what the clients show while a player recovers, with the fast cases of AutoRecoverySteps (1 second tick, 3
 * seconds start delay, every enemy disabled) and both players of the group in the forest: the first player life is
 * lowered and recovers; the second player gets no stats message and its stats stay the same; with the stored life bar
 * config (shown on click, not for every player) the second client draws no bar for the first player it does not target,
 * with every player bar shown on the second client (its page config only) it sees the first player bar grow, and with
 * every player bar and the bar on click off on the server (before the login) only the first client receives the life bar
 * updates of the first player; with the current player bar shown on the first client its own bar grows on each tick; and
 * on the first client the open stats panel life value (shown with its base life by the stored stat data) and the player
 * box life bar text and fill grow on the tick.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { LifeBarState } = require('./helpers/life-bar-state');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
const { UsersConst } = require('../../lib/users/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryPlayerBars
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static LIFE_BAR_PATH = 'client/ui/lifeBar';
    static LOW_LIFE = 1;
    static POLL_MS = 100;
    static RECOVERY_WAIT_MS = 8000;

    static async startCase(context, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryPlayerBars.PLAYERS_PATH),
            configValues
        ));
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await AutoRecoverySteps.restartFastTicks(context);
        return {
            secondContext,
            firstSessionId: await DeathObserverSteps.fetchSessionId(context.page)
        };
    }

    static async fetchLifeKey(gameConfig)
    {
        return await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ForestEnemyKill.AFFECTED_PROPERTY_PATH);
    }

    static async fetchPlayer(gameConfig)
    {
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName);
    }

    static async fetchLife(gameConfig)
    {
        return (await TestAutoRecoveryPlayerBars.fetchPlayer(gameConfig)).life;
    }

    static async lowerFirstPlayer(context)
    {
        return await AutoRecoverySteps.lowerPlayerLife(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            TestAutoRecoveryPlayerBars.LOW_LIFE
        );
    }

    static async waitForRecoveredLife(gameConfig, aboveLife)
    {
        await expect.poll(
            async () => await TestAutoRecoveryPlayerBars.fetchLife(gameConfig),
            {
                message: 'The life must recover',
                timeout: TestAutoRecoveryPlayerBars.RECOVERY_WAIT_MS,
                intervals: [TestAutoRecoveryPlayerBars.POLL_MS]
            }
        ).toBeGreaterThan(aboveLife);
        return await TestAutoRecoveryPlayerBars.fetchLife(gameConfig);
    }

    static async runOtherPlayerStatsTest(context)
    {
        let started = await TestAutoRecoveryPlayerBars.startCase(context);
        let secondGameConfig = started.secondContext.gameConfig;
        let secondStats = (await TestAutoRecoveryPlayerBars.fetchPlayer(secondGameConfig)).stats;
        await RoomMessagesRecorder.start(context.secondPage);
        await TestAutoRecoveryPlayerBars.lowerFirstPlayer(context);
        await TestAutoRecoveryPlayerBars.waitForRecoveredLife(context.gameConfig, TestAutoRecoveryPlayerBars.LOW_LIFE);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.secondPage, GameConst.PLAYER_STATS),
            'The second player gets no stats message from the first player recovery'
        ).toEqual([]);
        expect(
            (await TestAutoRecoveryPlayerBars.fetchPlayer(secondGameConfig)).stats,
            'The second player stats stay the same'
        ).toEqual(secondStats);
    }

    static async runNoBarWithoutTargetTest(context)
    {
        let started = await TestAutoRecoveryPlayerBars.startCase(context);
        await TestAutoRecoveryPlayerBars.lowerFirstPlayer(context);
        await TestAutoRecoveryPlayerBars.waitForRecoveredLife(context.gameConfig, TestAutoRecoveryPlayerBars.LOW_LIFE);
        await context.secondPage.waitForTimeout(AutoRecoverySteps.FAST_TICK_MS);
        expect(
            (await LifeBarState.fetchPlayerBar(context.secondPage, started.firstSessionId)).isDrawn,
            'The second client draws no bar for the first player it does not target'
        ).toBe(false);
    }

    static async runAllPlayersBarTest(context)
    {
        let started = await TestAutoRecoveryPlayerBars.startCase(context);
        await LifeBarState.setPageConfig(context.secondPage, {showAllPlayers: true});
        await TestAutoRecoveryPlayerBars.lowerFirstPlayer(context);
        let recoveredLife = await TestAutoRecoveryPlayerBars.waitForRecoveredLife(
            context.gameConfig,
            TestAutoRecoveryPlayerBars.LOW_LIFE
        );
        await expect.poll(
            async () => await LifeBarState.fetchPlayerBar(context.secondPage, started.firstSessionId),
            {message: 'The second client shows the first player bar grow', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expect.objectContaining({isDrawn: true, value: recoveredLife}));
    }

    static async runOnlyOwnUpdateTest(context)
    {
        let started = await TestAutoRecoveryPlayerBars.startCase(context, {
            [TestAutoRecoveryPlayerBars.LIFE_BAR_PATH+'/showAllPlayers']: false,
            [TestAutoRecoveryPlayerBars.LIFE_BAR_PATH+'/showOnClick']: false
        });
        await RoomMessagesRecorder.start(context.page);
        await RoomMessagesRecorder.start(context.secondPage);
        await TestAutoRecoveryPlayerBars.lowerFirstPlayer(context);
        await TestAutoRecoveryPlayerBars.waitForRecoveredLife(context.gameConfig, TestAutoRecoveryPlayerBars.LOW_LIFE);
        await context.page.waitForTimeout(AutoRecoverySteps.FAST_TICK_MS);
        let fetchOwnUpdates = async (page) => (await RoomMessagesRecorder.fetchMessages(
            page,
            UsersConst.ACTION_LIFEBAR_UPDATE
        )).filter(message => started.firstSessionId === message[ActionsConst.DATA_OWNER_KEY]);
        expect(
            (await fetchOwnUpdates(context.page)).length,
            'The first client receives its own life bar updates'
        ).toBeGreaterThan(0);
        expect(
            await fetchOwnUpdates(context.secondPage),
            'The second client receives no life bar update of the first player'
        ).toEqual([]);
    }

    static async runOwnBarTest(context)
    {
        let started = await TestAutoRecoveryPlayerBars.startCase(context);
        await LifeBarState.setPageConfig(context.page, {showCurrentPlayer: true});
        await TestAutoRecoveryPlayerBars.lowerFirstPlayer(context);
        let recoveredLife = await TestAutoRecoveryPlayerBars.waitForRecoveredLife(
            context.gameConfig,
            TestAutoRecoveryPlayerBars.LOW_LIFE
        );
        await expect.poll(
            async () => await LifeBarState.fetchPlayerBar(context.page, started.firstSessionId),
            {message: 'The own bar shows the recovered life', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expect.objectContaining({isDrawn: true, value: recoveredLife}));
        let nextLife = await TestAutoRecoveryPlayerBars.waitForRecoveredLife(context.gameConfig, recoveredLife);
        await expect.poll(
            async () => (await LifeBarState.fetchPlayerBar(context.page, started.firstSessionId)).value,
            {message: 'The own bar grows on the next tick', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(nextLife);
    }

    static async runStatsPanelTest(context)
    {
        await TestAutoRecoveryPlayerBars.startCase(context);
        await context.page.click(Selectors.hud.playerStatsOpen);
        let lifeValue = context.page.locator(Selectors.stats.valueByKey(
            await TestAutoRecoveryPlayerBars.fetchLifeKey(context.gameConfig)
        ));
        let baseText = ' / '+(await TestAutoRecoveryPlayerBars.fetchPlayer(context.gameConfig)).totalLife;
        await TestAutoRecoveryPlayerBars.lowerFirstPlayer(context);
        await expect(lifeValue, 'The stats panel shows the lowered life and the base life').toHaveText(
            TestAutoRecoveryPlayerBars.LOW_LIFE+baseText,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        let recoveredLife = await TestAutoRecoveryPlayerBars.waitForRecoveredLife(
            context.gameConfig,
            TestAutoRecoveryPlayerBars.LOW_LIFE
        );
        await expect(lifeValue, 'The stats panel life value grows on the tick').toHaveText(
            recoveredLife+baseText,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
    }

    static async runPlayerBoxBarTest(context)
    {
        await TestAutoRecoveryPlayerBars.startCase(context);
        let lifeKey = await TestAutoRecoveryPlayerBars.fetchLifeKey(context.gameConfig);
        let lifeBarText = context.page.locator('.stat-bar-'+lifeKey+' .stat-bar-text');
        let lifeBarFill = context.page.locator('.stat-bar-'+lifeKey+' .stat-bar-fill');
        let totalLife = (await TestAutoRecoveryPlayerBars.fetchPlayer(context.gameConfig)).totalLife;
        await TestAutoRecoveryPlayerBars.lowerFirstPlayer(context);
        let recoveredLife = await TestAutoRecoveryPlayerBars.waitForRecoveredLife(
            context.gameConfig,
            TestAutoRecoveryPlayerBars.LOW_LIFE
        );
        await expect(lifeBarText, 'The player box life bar value grows').toHaveText(
            recoveredLife+' / '+totalLife,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        await expect(lifeBarFill, 'The player box life bar fill grows').toHaveAttribute(
            'style',
            new RegExp('width: '+String((recoveredLife / totalLife) * 100).replace('.', '\\.')+'%')
        );
    }

    static run()
    {
        test.describe('Auto Recovery Player Bars', () => {
            test('other player gets no stats message and keeps its stats while a player recovers', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayerBars.runOtherPlayerStatsTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('stored life bar config draws no bar for a recovering player that is not targeted', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayerBars.runNoBarWithoutTargetTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('every player bar shown on the other client shows the recovering player bar grow', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayerBars.runAllPlayersBarTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('every player bar and bar on click off sends the recovery bar update only to the player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayerBars.runOnlyOwnUpdateTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('current player bar shown grows on each recovery tick', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayerBars.runOwnBarTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('open stats panel life value grows on the recovery tick', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayerBars.runStatsPanelTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('player box life bar value and fill grow on the recovery tick', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryPlayerBars.runPlayerBoxBarTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestAutoRecoveryPlayerBars.run();
