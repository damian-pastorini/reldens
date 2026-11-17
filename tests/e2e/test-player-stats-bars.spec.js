/**
 *
 * Reldens - Test Player Stats Bars
 *
 * Tests the player box stats bars built from the stored client/players/barsProperties config: every configured bar
 * shows the live "value / base" and a fill width of the value percent, and follows a changed stat; a stat with the base
 * 0 (its players_stats base_value changed for the group) shows a 0% fill; with the config changed for the group (on the
 * server and in the initial client config the server writes on start, the client merges both), a bar disabled, without
 * label or without a color is not rendered while a ready bar is; without the config (removed from
 * the server config and turned off in the initial client config the server writes with it on start) no bars wrapper is
 * rendered; and a bar for a stat missing from the stats message is skipped while the other bars render.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPlayerStatsBars
{

    static BARS_PATH = 'client/players/barsProperties';
    static BARS_WRAPPER = '#player-stats-bars-wrapper';
    static BAR_CONTAINER = '.stat-bar-container';
    static MISSING_STAT_KEY = 'e2eMissingStat';
    static FULL_PERCENT = 100;

    static async enterForest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let player = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName);
        expect(player.stats, 'The player stats must be read: '+player.error).toBeTruthy();
        return player;
    }

    static async loadBarsConfig(gameConfig)
    {
        let storedConfig = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestPlayerStatsBars.BARS_PATH);
        let barsConfig = sc.isObject(storedConfig) ? storedConfig : sc.toJson(storedConfig, {});
        expect(Object.keys(barsConfig).length, 'The bars must be configured').toBeGreaterThan(0);
        return barsConfig;
    }

    static async expectBar(page, statKey, value, base)
    {
        let barSelector = TestPlayerStatsBars.BARS_WRAPPER+' .stat-bar-'+statKey+' ';
        await expect(page.locator(barSelector+'.stat-bar-text'), 'The '+statKey+' bar text')
            .toHaveText(value+' / '+base, {timeout: TimeConstants.SERVER_RESPONSE});
        let percent = 0 < base ? value / base * TestPlayerStatsBars.FULL_PERCENT : 0;
        await expect(page.locator(barSelector+'.stat-bar-fill'), 'The '+statKey+' bar fill')
            .toHaveAttribute('style', new RegExp('width: '+percent+'%'));
    }

    static async expectRenderedBars(page, statsKeys)
    {
        await expect.poll(
            async () => await page.locator(TestPlayerStatsBars.BARS_WRAPPER+' '+TestPlayerStatsBars.BAR_CONTAINER).evaluateAll(
                bars => bars.map(bar => bar.querySelector('.stat-bar-fill').dataset.statKey)
            ),
            {message: 'The rendered bars', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(statsKeys);
    }

    static async runBarsTest(context)
    {
        let barsConfig = await TestPlayerStatsBars.loadBarsConfig(context.gameConfig);
        let player = await TestPlayerStatsBars.enterForest(context);
        for(let statKey of Object.keys(barsConfig)){
            await TestPlayerStatsBars.expectBar(context.page, statKey, player.stats[statKey], player.statsBase[statKey]);
        }
        let changedKey = [...Object.keys(barsConfig)].shift();
        let changedValue = player.stats[changedKey] - 1;
        await GameplayE2eStateApi.setPlayerStats(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            {[changedKey]: changedValue}
        );
        await TestPlayerStatsBars.expectBar(context.page, changedKey, changedValue, player.statsBase[changedKey]);
    }

    static async runZeroBaseTest(context)
    {
        let barsConfig = await TestPlayerStatsBars.loadBarsConfig(context.gameConfig);
        let statKey = [...Object.keys(barsConfig)].pop();
        await E2eSeedAndRestoreApi.updateWithPreserve(context.gameConfig, context.e2eGroup, 'playersStats', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: context.gameConfig.e2ePlayerName}),
            stat_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'stats', {key: statKey})
        }, {base_value: 0});
        let player = await TestPlayerStatsBars.enterForest(context);
        expect(player.statsBase[statKey], 'The stat base must be 0').toBe(0);
        await TestPlayerStatsBars.expectBar(context.page, statKey, player.stats[statKey], 0);
    }

    static async overrideBarsConfig(context, barsConfig)
    {
        await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, TestPlayerStatsBars.BARS_PATH, barsConfig);
        await InitialClientConfig.override(context.page, TestPlayerStatsBars.BARS_PATH, barsConfig);
    }

    static async runNotReadyBarsTest(context)
    {
        let barsConfig = await TestPlayerStatsBars.loadBarsConfig(context.gameConfig);
        let [readyKey, disabledKey] = Object.keys(barsConfig);
        let readyBar = barsConfig[readyKey];
        await TestPlayerStatsBars.overrideBarsConfig(context, {
            [readyKey]: readyBar,
            [disabledKey]: Object.assign({}, barsConfig[disabledKey], {enabled: false}),
            atk: Object.assign({}, readyBar, {label: ''}),
            def: Object.assign({}, readyBar, {activeColor: ''}),
            dodge: Object.assign({}, readyBar, {inactiveColor: ''})
        });
        await TestPlayerStatsBars.enterForest(context);
        await TestPlayerStatsBars.expectRenderedBars(context.page, [readyKey]);
    }

    static async runNoConfigTest(context)
    {
        await E2eSeedAndRestoreApi.removeConfig(context.gameConfig, context.e2eGroup, TestPlayerStatsBars.BARS_PATH);
        await InitialClientConfig.override(context.page, TestPlayerStatsBars.BARS_PATH, false);
        await TestPlayerStatsBars.enterForest(context);
        await context.page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        await expect(context.page.locator(TestPlayerStatsBars.BARS_WRAPPER), 'No bars wrapper').toHaveCount(0);
        await expect(context.page.locator(TestPlayerStatsBars.BAR_CONTAINER), 'No bars').toHaveCount(0);
    }

    static async runMissingStatTest(context)
    {
        let barsConfig = await TestPlayerStatsBars.loadBarsConfig(context.gameConfig);
        let readyKey = [...Object.keys(barsConfig)].shift();
        await TestPlayerStatsBars.overrideBarsConfig(context, {
            [TestPlayerStatsBars.MISSING_STAT_KEY]: barsConfig[readyKey],
            [readyKey]: barsConfig[readyKey]
        });
        await TestPlayerStatsBars.enterForest(context);
        await TestPlayerStatsBars.expectRenderedBars(context.page, [readyKey]);
    }

    static run()
    {
        test.describe('Player Stats Bars', () => {
            test('configured bars show the live value, base and fill and follow a changed stat', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsBars.runBarsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('stat with the base 0 shows an empty bar', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsBars.runZeroBaseTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('disabled bar or bar without label or color is not rendered', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsBars.runNotReadyBarsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('without the bars config no bars wrapper is rendered', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsBars.runNoConfigTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('bar for a stat missing from the message is skipped', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerStatsBars.runMissingStatTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestPlayerStatsBars.run();
