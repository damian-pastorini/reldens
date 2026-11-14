/**
 *
 * Reldens - Test Player Stats Panel
 *
 * Tests the player stats panel against the stored stats and the live player stats (a stat change sent with the same
 * stats save and client update a battle hit uses, GameplayE2eStateApi.setPlayerStats): every stat shows its live value,
 * plus " / base" for the stored showBase stats; the open panel follows the lowered and the raised
 * life; the stats message reaches only the player that requested it; the close button hides the panel and shows the
 * open button; a stat changed with the panel closed is shown when it opens again; with the panel disabled for the group
 * there is no panel or button and the stats messages raise no client error; the changed stats are shown again after a
 * new login and after a room change; and a player without stats rows (its rows moved for the group to a player created
 * for the group) enters the game with an empty panel and no client error.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPlayerStatsPanel
{

    static LIFE_KEY = 'hp';
    static LOWERED_LIFE_DIVIDER = 2;
    static PANEL_ENABLED_PATH = 'client/ui/playerStats/enabled';
    static STATS_HOLDER_NAME = 'E2eStatsHolder';

    static async enterForest(context, logins = 1)
    {
        test.setTimeout(logins * TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        return await TestPlayerStatsPanel.fetchPlayer(context.gameConfig);
    }

    static async fetchPlayer(gameConfig, roomName = Login.FOREST_ROOM_NAME)
    {
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
        expect(player.stats, 'The stats of '+gameConfig.e2ePlayerName+' must be read: '+player.error).toBeTruthy();
        return player;
    }

    static async openPanel(page)
    {
        await page.click(Selectors.hud.playerStatsOpen);
        await expect(page.locator(Selectors.hud.playerStatsUi), 'The stats panel opens').toBeVisible();
    }

    static async fetchPanelTexts(page, statsKeys, selectorByKey)
    {
        let texts = {};
        for(let statKey of statsKeys){
            texts[statKey] = ((await page.locator(selectorByKey(statKey)).textContent()) || '').trim();
        }
        return texts;
    }

    static expectedValues(statsRows, player)
    {
        return Object.fromEntries(statsRows.map(statRow => [
            statRow.key,
            player.stats[statRow.key]
                +(sc.get(sc.toJson(statRow.customData, {}), 'showBase', false) ? ' / '+player.statsBase[statRow.key] : '')
        ]));
    }

    static async expectPanelValues(context, statsRows, roomName = Login.FOREST_ROOM_NAME)
    {
        let player = await TestPlayerStatsPanel.fetchPlayer(context.gameConfig, roomName);
        await expect.poll(
            async () => await TestPlayerStatsPanel.fetchPanelTexts(
                context.page,
                statsRows.map(statRow => statRow.key),
                Selectors.stats.valueByKey
            ),
            {message: 'The panel shows the live stats', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(TestPlayerStatsPanel.expectedValues(statsRows, player));
    }

    static async changeLife(context, life, roomName = Login.FOREST_ROOM_NAME)
    {
        let changed = await GameplayE2eStateApi.setPlayerStats(
            context.gameConfig,
            roomName,
            context.gameConfig.e2ePlayerName,
            {[TestPlayerStatsPanel.LIFE_KEY]: life}
        );
        expect(changed.stats, 'The life must change: '+changed.error).toBeTruthy();
    }

    static collectPageErrors(page)
    {
        let pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        return pageErrors;
    }

    static async runValuesAndLabelsTest(context)
    {
        let statsRows = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'stats', {});
        await TestPlayerStatsPanel.enterForest(context);
        await TestPlayerStatsPanel.openPanel(context.page);
        await TestPlayerStatsPanel.expectPanelValues(context, statsRows);
    }

    static async runLiveUpdateTest(context)
    {
        let statsRows = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'stats', {});
        let player = await TestPlayerStatsPanel.enterForest(context);
        await TestPlayerStatsPanel.openPanel(context.page);
        let fullLife = player.stats[TestPlayerStatsPanel.LIFE_KEY];
        await TestPlayerStatsPanel.changeLife(context, Math.floor(fullLife / TestPlayerStatsPanel.LOWERED_LIFE_DIVIDER));
        await TestPlayerStatsPanel.expectPanelValues(context, statsRows);
        await TestPlayerStatsPanel.changeLife(context, fullLife);
        await TestPlayerStatsPanel.expectPanelValues(context, statsRows);
    }

    static async runRequesterOnlyTest(context)
    {
        let player = await TestPlayerStatsPanel.enterForest(context, 2);
        await Login.loginAndEnterForest(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun);
        await RoomMessagesRecorder.start(context.secondPage);
        await RoomMessagesRecorder.start(context.page);
        await RoomMessagesRecorder.sendMessage(context.page, {act: GameConst.PLAYER_STATS});
        await TestPlayerStatsPanel.changeLife(context, player.stats[TestPlayerStatsPanel.LIFE_KEY] - 1);
        await expect.poll(
            async () => (await RoomMessagesRecorder.fetchMessages(context.page, GameConst.PLAYER_STATS)).length,
            {message: 'The requesting player gets its stats', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThanOrEqual(2);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.secondPage, GameConst.PLAYER_STATS),
            'The other player gets no stats message'
        ).toEqual([]);
    }

    static async runCloseButtonTest(context)
    {
        await TestPlayerStatsPanel.enterForest(context);
        await TestPlayerStatsPanel.openPanel(context.page);
        await expect(context.page.locator(Selectors.hud.playerStatsOpen), 'The open button hides').toBeHidden();
        await context.page.click(Selectors.hud.playerStatsClose);
        await expect(context.page.locator(Selectors.hud.playerStatsUi), 'The close button hides the panel').toBeHidden();
        await expect(context.page.locator(Selectors.hud.playerStatsOpen), 'The open button shows again').toBeVisible();
    }

    static async runClosedChangeTest(context)
    {
        let statsRows = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'stats', {});
        let player = await TestPlayerStatsPanel.enterForest(context);
        await TestPlayerStatsPanel.openPanel(context.page);
        await context.page.click(Selectors.hud.playerStatsClose);
        await TestPlayerStatsPanel.changeLife(context, player.stats[TestPlayerStatsPanel.LIFE_KEY] - 1);
        await TestPlayerStatsPanel.openPanel(context.page);
        await TestPlayerStatsPanel.expectPanelValues(context, statsRows);
    }

    static async runDisabledPanelTest(context)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestPlayerStatsPanel.PANEL_ENABLED_PATH,
            false
        );
        let pageErrors = TestPlayerStatsPanel.collectPageErrors(context.page);
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun));
        await Login.startConfigPlayer(context.page, gameConfig, context.longRun, Login.FOREST_ROOM_NAME, true);
        await Navigation.waitForRoom(context.page, Login.FOREST_ROOM_NAME, TimeConstants.SCENE_LOAD);
        let player = await TestPlayerStatsPanel.fetchPlayer(gameConfig);
        await expect(context.page.locator(Selectors.hud.playerStatsOpen), 'No open button').toHaveCount(0);
        await expect(context.page.locator(Selectors.hud.playerStatsUi), 'No panel').toHaveCount(0);
        await RoomMessagesRecorder.start(context.page);
        await TestPlayerStatsPanel.changeLife(context, player.stats[TestPlayerStatsPanel.LIFE_KEY] - 1);
        await RoomMessagesRecorder.waitForMessage(context.page, GameConst.PLAYER_STATS, TimeConstants.SERVER_RESPONSE);
        expect(pageErrors, 'The stats message raises no client error').toEqual([]);
    }

    static async runNewLoginTest(context)
    {
        let statsRows = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'stats', {});
        let player = await TestPlayerStatsPanel.enterForest(context, 2);
        await TestPlayerStatsPanel.changeLife(context, player.stats[TestPlayerStatsPanel.LIFE_KEY] - 1);
        await context.page.reload();
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await Navigation.waitForRoom(context.page, Login.FOREST_ROOM_NAME, TimeConstants.SCENE_LOAD);
        expect(
            (await TestPlayerStatsPanel.fetchPlayer(context.gameConfig)).stats[TestPlayerStatsPanel.LIFE_KEY],
            'The new login loads the stored life'
        ).toBe(player.stats[TestPlayerStatsPanel.LIFE_KEY] - 1);
        await TestPlayerStatsPanel.openPanel(context.page);
        await TestPlayerStatsPanel.expectPanelValues(context, statsRows);
    }

    static async runRoomChangeTest(context)
    {
        let statsRows = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'stats', {});
        let player = await TestPlayerStatsPanel.enterForest(context);
        await TestPlayerStatsPanel.changeLife(context, player.stats[TestPlayerStatsPanel.LIFE_KEY] - 1);
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        expect(
            (await TestPlayerStatsPanel.fetchPlayer(context.gameConfig, Login.TOWN_ROOM_NAME)).stats[TestPlayerStatsPanel.LIFE_KEY],
            'The room change keeps the changed life'
        ).toBe(player.stats[TestPlayerStatsPanel.LIFE_KEY] - 1);
        await expect(context.page.locator(Selectors.hud.playerStatsOpen)).toBeVisible({timeout: TimeConstants.SCENE_LOAD});
        await TestPlayerStatsPanel.openPanel(context.page);
        await TestPlayerStatsPanel.expectPanelValues(context, statsRows, Login.TOWN_ROOM_NAME);
    }

    static async runNoStatsRowsTest(context)
    {
        let gameConfig = context.gameConfig;
        let playerRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {name: gameConfig.e2ePlayerName})].shift();
        let holder = await E2eSeedAndRestoreApi.createRow(gameConfig, context.e2eGroup, 'players', {
            user_id: playerRow.user_id,
            name: TestPlayerStatsPanel.STATS_HOLDER_NAME
        });
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'playersStats', {player_id: holder.id});
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'playersStats', {player_id: playerRow.id}, {
            player_id: holder.id
        });
        let pageErrors = TestPlayerStatsPanel.collectPageErrors(context.page);
        let player = await TestPlayerStatsPanel.enterForest(context);
        expect(player.stats, 'The player without stats rows has no stats').toEqual({});
        await TestPlayerStatsPanel.openPanel(context.page);
        await expect(context.page.locator(Selectors.stats.container), 'The panel is empty').toHaveCount(0);
        expect(pageErrors, 'The game raises no client error').toEqual([]);
    }

    static run()
    {
        test.describe('Player Stats Panel', () => {
            test('every stat shows its live value and the showBase base', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runValuesAndLabelsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('open panel follows the lowered and raised life', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runLiveUpdateTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('stats message reaches only the requesting player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runRequesterOnlyTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('close button hides the panel and shows the open button', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runCloseButtonTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('stat changed with the panel closed is shown when it opens again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runClosedChangeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('disabled panel shows no panel or button and stats messages raise no error', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runDisabledPanelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('changed stats are shown again after a new login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runNewLoginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('changed stats are shown again after a room change', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runRoomChangeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player without stats rows enters with an empty panel and no error', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsPanel.runNoStatsRowsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestPlayerStatsPanel.run();
