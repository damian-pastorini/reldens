/**
 *
 * Reldens - Test Player Life Bars
 *
 * Tests the player life bars of the clients (LifeBarState) with the group players in the forest (the second one placed
 * next to the first one) and the player life lowered on the server (its stats saved and sent like a hit does): with the
 * stored config (bar on click) the second client draws the first player bar only after targeting it (the same client
 * method the sprite click calls) and follows its updates; with every player bar on and the bar on click off (server and
 * clients, changed for the group before the login) the second client draws it without a target and follows its
 * updates; with the life bars off no client draws a bar; the own bar with a fixed position (page config of the client)
 * is drawn on the UI scene at the configured responsive position and moves with the game size; the second client
 * removes the first player bar when that player leaves the room; clearing the target (escape key) destroys the targeted
 * player bar and keeps the own bar when the own player was the target; and a disabled or dead player hides its own bar.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { LifeBarState } = require('./helpers/life-bar-state');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPlayerLifeBars
{

    static LIFE_BAR_PATH = 'client/ui/lifeBar';
    static RESPONSIVE_PATH = 'client/ui/screen/responsive';
    static LIFE_STEP = 1;
    static PERCENT_BASE = 100;
    static RESIZED_VIEWPORT = {width: 1000, height: 700};
    static CLEAR_TARGET_KEY = 'Escape';

    static async enterBoth(context, configValues = {})
    {
        for(let configKey of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(
                context.gameConfig,
                context.e2eGroup,
                TestPlayerLifeBars.LIFE_BAR_PATH+'/'+configKey,
                configValues[configKey]
            );
        }
        await DeathObserverSteps.loginBothInForest(context);
        let firstSessionId = await DeathObserverSteps.fetchSessionId(context.page);
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName2,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The second player must be placed next to the first one: '+placed.error).toBeTruthy();
        await Phaser.waitForPlayerBySessionId(context.secondPage, firstSessionId, TimeConstants.SCENE_LOAD);
        return firstSessionId;
    }

    static async lowerLife(gameConfig, playerName = gameConfig.e2ePlayerName)
    {
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName);
        let life = {value: player.life - TestPlayerLifeBars.LIFE_STEP, total: player.totalLife};
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(gameConfig, Login.FOREST_ROOM_NAME, playerName, life.value);
        expect(lowered.value, 'The life of '+playerName+' must be lowered: '+lowered.error).toBe(life.value);
        return life;
    }

    static async targetPlayer(page, sessionId)
    {
        await page.evaluate((targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId), sessionId);
    }

    static async expectFirstBar(context, firstSessionId, expectedBar, message)
    {
        await expect.poll(
            async () => await LifeBarState.fetchPlayerBar(context.secondPage, firstSessionId),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expect.objectContaining(expectedBar));
    }

    static async expectOwnBar(page, expectedBar, message)
    {
        await expect.poll(async () => await LifeBarState.fetchOwnBar(page), {message, timeout: TimeConstants.SERVER_RESPONSE})
            .toEqual(expect.objectContaining(expectedBar));
    }

    static async runBarOnClickTest(context)
    {
        let firstSessionId = await TestPlayerLifeBars.enterBoth(context);
        await context.secondPage.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect((await LifeBarState.fetchPlayerBar(context.secondPage, firstSessionId)).isDrawn, 'No bar before the target')
            .toBe(false);
        let first = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName);
        await TestPlayerLifeBars.targetPlayer(context.secondPage, firstSessionId);
        await TestPlayerLifeBars.expectFirstBar(context, firstSessionId, {
            isDrawn: true,
            value: first.life,
            total: first.totalLife
        }, 'The targeted player bar is drawn with its life');
        let lowered = await TestPlayerLifeBars.lowerLife(context.gameConfig);
        await TestPlayerLifeBars.expectFirstBar(
            context,
            firstSessionId,
            Object.assign({isDrawn: true}, lowered),
            'The targeted player bar follows its life'
        );
    }

    static async runAllPlayersBarTest(context)
    {
        let firstSessionId = await TestPlayerLifeBars.enterBoth(context, {showOnClick: false, showAllPlayers: true});
        let lowered = await TestPlayerLifeBars.lowerLife(context.gameConfig);
        await TestPlayerLifeBars.expectFirstBar(
            context,
            firstSessionId,
            Object.assign({isDrawn: true}, lowered),
            'The first player bar is drawn without a target and follows its life'
        );
    }

    static async runLifeBarsOffTest(context)
    {
        let firstSessionId = await TestPlayerLifeBars.enterBoth(context, {enabled: false});
        await LifeBarState.setPageConfig(context.secondPage, {showCurrentPlayer: true});
        await TestPlayerLifeBars.targetPlayer(context.secondPage, firstSessionId);
        await TestPlayerLifeBars.lowerLife(context.gameConfig);
        await TestPlayerLifeBars.lowerLife(context.gameConfig, context.gameConfig.e2ePlayerName2);
        await context.secondPage.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect(await LifeBarState.fetchDrawnBarsCount(context.page), 'The first client draws no bar').toBe(0);
        expect(await LifeBarState.fetchDrawnBarsCount(context.secondPage), 'The second client draws no bar').toBe(0);
    }

    static async enterWithFixedOwnBar(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun));
        expect(await E2eSeedAndRestoreApi.fetchConfigValue(context.gameConfig, TestPlayerLifeBars.RESPONSIVE_PATH), 'Responsive UI')
            .toBeTruthy();
        let responsive = {};
        for(let axisKey of ['responsiveX', 'responsiveY']){
            responsive[axisKey] = Number(await E2eSeedAndRestoreApi.fetchConfigValue(
                context.gameConfig,
                TestPlayerLifeBars.LIFE_BAR_PATH+'/'+axisKey
            ));
        }
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await LifeBarState.setPageConfig(context.page, {fixedPosition: true, showCurrentPlayer: true});
        await TestPlayerLifeBars.lowerLife(context.gameConfig);
        await TestPlayerLifeBars.expectOwnBar(context.page, {isDrawn: true, isOnUiScene: true}, 'The own bar is on the UI scene');
        return responsive;
    }

    static fixedPosition(ownBar, responsive)
    {
        return {
            x: responsive.responsiveX * ownBar.screenWidth / TestPlayerLifeBars.PERCENT_BASE,
            y: responsive.responsiveY * ownBar.screenHeight / TestPlayerLifeBars.PERCENT_BASE
        };
    }

    static async runFixedPositionTest(context)
    {
        let responsive = await TestPlayerLifeBars.enterWithFixedOwnBar(context);
        let ownBar = await LifeBarState.fetchOwnBar(context.page);
        expect({x: ownBar.x, y: ownBar.y}, 'The own bar is on the configured position')
            .toEqual(TestPlayerLifeBars.fixedPosition(ownBar, responsive));
    }

    static async runResizedFixedPositionTest(context)
    {
        let responsive = await TestPlayerLifeBars.enterWithFixedOwnBar(context);
        let ownBarBefore = await LifeBarState.fetchOwnBar(context.page);
        await context.page.setViewportSize(TestPlayerLifeBars.RESIZED_VIEWPORT);
        await expect.poll(async () => (await LifeBarState.fetchOwnBar(context.page)).screenWidth, {message: 'Resized'})
            .not.toBe(ownBarBefore.screenWidth);
        let expectedPosition = TestPlayerLifeBars.fixedPosition(await LifeBarState.fetchOwnBar(context.page), responsive);
        expect(expectedPosition, 'The resize changes the configured position').not.toEqual({x: ownBarBefore.x, y: ownBarBefore.y});
        await TestPlayerLifeBars.expectOwnBar(
            context.page,
            Object.assign({isDrawn: true, isOnUiScene: true}, expectedPosition),
            'The own bar is drawn again on the new position'
        );
    }

    static async runLeftPlayerBarTest(context)
    {
        let firstSessionId = await TestPlayerLifeBars.enterBoth(context);
        await TestPlayerLifeBars.targetPlayer(context.secondPage, firstSessionId);
        await TestPlayerLifeBars.expectFirstBar(context, firstSessionId, {isDrawn: true, isKept: true}, 'The bar is drawn');
        await context.page.reload();
        await TestPlayerLifeBars.expectFirstBar(context, firstSessionId, {isDrawn: false, isKept: false}, 'The bar is removed');
    }

    static async runClearedTargetTest(context)
    {
        let firstSessionId = await TestPlayerLifeBars.enterBoth(context);
        await TestPlayerLifeBars.targetPlayer(context.secondPage, firstSessionId);
        await TestPlayerLifeBars.expectFirstBar(context, firstSessionId, {isDrawn: true}, 'The targeted player bar is drawn');
        await context.secondPage.keyboard.press(TestPlayerLifeBars.CLEAR_TARGET_KEY);
        await TestPlayerLifeBars.expectFirstBar(context, firstSessionId, {isDrawn: false}, 'The cleared target bar is destroyed');
    }

    static async runClearedOwnTargetTest(context)
    {
        await TestPlayerLifeBars.enterBoth(context);
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await LifeBarState.setPageConfig(context.secondPage, {showCurrentPlayer: true});
        await CombatSkillCasting.targetSelf(context.secondPage);
        await TestPlayerLifeBars.lowerLife(secondGameConfig);
        await TestPlayerLifeBars.expectOwnBar(context.secondPage, {isDrawn: true}, 'The own bar is drawn');
        await context.secondPage.keyboard.press(TestPlayerLifeBars.CLEAR_TARGET_KEY);
        await expect.poll(
            async () => await context.secondPage.evaluate(() => window.reldens.getCurrentPlayer().currentTarget),
            {message: 'The own target is cleared', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(false);
        expect((await LifeBarState.fetchOwnBar(context.secondPage)).isDrawn, 'The own bar stays').toBe(true);
    }

    static async runHiddenOwnBarTest(context, inState)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await LifeBarState.setPageConfig(context.page, {showCurrentPlayer: true});
        await TestPlayerLifeBars.lowerLife(context.gameConfig);
        await TestPlayerLifeBars.expectOwnBar(context.page, {isDrawn: true, isVisible: true}, 'The own bar is shown');
        await GameplayE2eStateApi.setPlayerState(context.gameConfig, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName, inState);
        await expect.poll(
            async () => await context.page.evaluate(() => window.reldens.getCurrentPlayer().state.inState),
            {message: 'The client gets the player state', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(inState);
        await TestPlayerLifeBars.lowerLife(context.gameConfig);
        await TestPlayerLifeBars.expectOwnBar(context.page, {isVisible: false}, 'The own bar is hidden');
    }

    static run()
    {
        test.describe('Player Life Bars', () => {
            test('bar on click: the targeted player bar is drawn and follows its life', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runBarOnClickTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('every player bar: the other player bar is drawn without a target and follows its life', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runAllPlayersBarTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('life bars off: no client draws a bar', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runLifeBarsOffTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('fixed position own bar is drawn on the UI scene at the configured position', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runFixedPositionTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('fixed position own bar moves with the game size', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runResizedFixedPositionTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player leaving the room removes its bar from the other client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runLeftPlayerBarTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cleared target destroys the targeted player bar', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runClearedTargetTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cleared own target keeps the own bar', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runClearedOwnTargetTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('disabled player hides its own bar', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runHiddenOwnBarTest({page, screenshots, gameConfig, e2eGroup, longRun}, GameConst.STATUS.DISABLED);
            });
            test('dead player hides its own bar', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPlayerLifeBars.runHiddenOwnBarTest({page, screenshots, gameConfig, e2eGroup, longRun}, GameConst.STATUS.DEATH);
            });
        });
    }

}

TestPlayerLifeBars.run();
