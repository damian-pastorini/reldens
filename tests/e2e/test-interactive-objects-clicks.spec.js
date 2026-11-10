/**
 *
 * Reldens - Test Interactive Objects Clicks
 *
 * Tests the real canvas clicks on the first forest mining rock (TimingMiningSteps, the interaction messages the server
 * hands to the rock counted): a click in range starts the timing and clears the client pending action; a double click
 * sends one interaction; a click out of reach starts nothing and a later click in range starts the timing; a second
 * player clicking the rock in use gets no message and its later click, once the rock is free, starts its timing; the
 * same player sending the interaction twice during a timing gets one timing and one reward; a click on a page element
 * placed over the rock sends nothing; and with the tap movement on, a click on the rock next to the player does not
 * walk it, so the timing is not cancelled by its own click.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjectsClicks
{

    static OUT_OF_REACH_TILES = 3;
    static CLICK_SETTLE_MS = 1000;
    static CLICK_OFFSET = 10;
    static LIFE_STEP = 1;

    static async prepareClicks(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await context.page.click(Selectors.hud.inventoryClose);
        await expect(context.page.locator(Selectors.inventory.ui), 'The inventory panel is closed').toBeHidden();
        await TimingMiningSteps.countInteractions(context.gameConfig, context.e2eGroup, mining.rockKey);
        await TimingObjectSession.recordTimingActions(context.page);
        return mining;
    }

    static async expectInteractions(context, mining, expectedCount, message)
    {
        await context.page.waitForTimeout(TestInteractiveObjectsClicks.CLICK_SETTLE_MS);
        expect(await TimingMiningSteps.fetchInteractions(context.gameConfig, mining.rockKey), message).toBe(expectedCount);
    }

    static async placeNextToRock(page, gameConfig, mining, minimumTilesDistance = 0)
    {
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            mining.rockKey,
            TimeConstants.SCENE_LOAD,
            minimumTilesDistance
        );
        expect(placed.reached, 'The player must be placed next to the rock: '+sc.toJsonString(placed)).toBe(true);
        return placed;
    }

    static async runRealClickTest(context)
    {
        let mining = await TestInteractiveObjectsClicks.prepareClicks(context);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, mining.rockKey, TestInteractiveObjectsClicks.CLICK_OFFSET);
        await TestInteractiveObjectsClicks.expectInteractions(context, mining, 1, 'One interaction');
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.START, mining.serverTimeout);
        expect(await TimingMiningSteps.fetchPendingAction(context.page, mining.rockKey), 'The start clears the pending action')
            .toBe(false);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The clicked rock is mined');
    }

    static async runDoubleClickTest(context)
    {
        let mining = await TestInteractiveObjectsClicks.prepareClicks(context);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, mining.rockKey, TestInteractiveObjectsClicks.CLICK_OFFSET, true);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.START, mining.serverTimeout);
        await TestInteractiveObjectsClicks.expectInteractions(context, mining, 1, 'A double click sends one interaction');
    }

    static async runOutOfReachTest(context)
    {
        let mining = await TestInteractiveObjectsClicks.prepareClicks(context);
        let placed = await TestInteractiveObjectsClicks.placeNextToRock(
            context.page,
            context.gameConfig,
            mining,
            TestInteractiveObjectsClicks.OUT_OF_REACH_TILES
        );
        expect(TimingMiningSteps.isInsideArea(placed.position, mining.rock), 'The player is out of reach').toBe(false);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, mining.rockKey, TestInteractiveObjectsClicks.CLICK_OFFSET);
        await TestInteractiveObjectsClicks.expectInteractions(context, mining, 1, 'The out of reach click is sent');
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'No timing out of reach').toEqual([]);
        await TestInteractiveObjectsClicks.placeNextToRock(context.page, context.gameConfig, mining);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, mining.rockKey, TestInteractiveObjectsClicks.CLICK_OFFSET);
        await context.page.waitForTimeout(TestInteractiveObjectsClicks.CLICK_SETTLE_MS);
    }

    static async runSecondPlayerClickTest(context)
    {
        let mining = await TestInteractiveObjectsClicks.prepareClicks(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        await TestInteractiveObjectsClicks.placeNextToRock(context.secondPage, secondGameConfig, mining);
        await TimingObjectSession.recordTimingActions(context.secondPage);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        expect(await Phaser.triggerObjectInteraction(context.secondPage, mining.rockKey), 'The second player interaction').toBe(true);
        await TestInteractiveObjectsClicks.expectInteractions(context, mining, 2, 'The second player interaction is received');
        expect(await TimingObjectSession.fetchRecordedActions(context.secondPage), 'No message for the busy rock')
            .toEqual([]);
        let life = (await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName
        )).life;
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            life - TestInteractiveObjectsClicks.LIFE_STEP
        );
        expect(lowered.value, 'The first miner life is lowered').toBe(life - TestInteractiveObjectsClicks.LIFE_STEP);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, mining.serverTimeout);
        expect(await Phaser.triggerObjectInteraction(context.secondPage, mining.rockKey), 'The later interaction').toBe(true);
        await TimingObjectSession.waitForTimingAction(context.secondPage, TimingMiningSteps.START, mining.serverTimeout);
    }

    static async runSameMessageTwiceTest(context)
    {
        let mining = await TestInteractiveObjectsClicks.prepareClicks(context);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        expect(await Phaser.triggerObjectInteraction(context.page, mining.rockKey), 'The second message is sent').toBe(true);
        await TestInteractiveObjectsClicks.expectInteractions(context, mining, 2, 'Both messages reach the rock');
        await TimingMiningSteps.expectCompleted(context.page, mining, 'One timing and one reward');
    }

    static async runOverlayClickTest(context)
    {
        let mining = await TestInteractiveObjectsClicks.prepareClicks(context);
        expect(
            await Phaser.clickPageElementOverObject(context.page, mining.rockKey, TestInteractiveObjectsClicks.CLICK_OFFSET),
            'A page element over the rock is clicked'
        ).toBe(true);
        await TestInteractiveObjectsClicks.expectInteractions(context, mining, 0, 'A click on a page element sends nothing');
    }

    static async runTapMovementClickTest(context)
    {
        let mining = await TestInteractiveObjectsClicks.prepareClicks(context);
        await context.page.evaluate(
            () => Object.assign(window.reldens.config.get('client/players/tapMovement'), {enabled: true})
        );
        let position = await Phaser.getPlayerServerPosition(context.page);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, mining.rockKey, TestInteractiveObjectsClicks.CLICK_OFFSET);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.START, mining.serverTimeout);
        await context.page.waitForTimeout(TestInteractiveObjectsClicks.CLICK_SETTLE_MS);
        expect(sc.toJsonString(await Phaser.getPlayerServerPosition(context.page)), 'The click does not walk the player')
            .toBe(sc.toJsonString(position));
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The click does not cancel its timing');
    }

    static run()
    {
        test.describe('Interactive Objects Clicks', () => {
            test('real click on a rock in range starts the timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsClicks.runRealClickTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('double click on a rock sends one interaction', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsClicks.runDoubleClickTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('click out of reach starts nothing and a later click in range starts the timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsClicks.runOutOfReachTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second player click on a busy rock gets nothing and its later click starts its timing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsClicks.runSecondPlayerClickTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('same interaction sent twice gives one timing and one reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsClicks.runSameMessageTwiceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('click on a page element over the rock sends nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsClicks.runOverlayClickTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('tap movement click on the rock does not walk the player or cancel the timing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsClicks.runTapMovementClickTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestInteractiveObjectsClicks.run();
