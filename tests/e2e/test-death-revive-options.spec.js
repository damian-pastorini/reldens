/**
 *
 * Reldens - Test Death Revive Options
 *
 * Tests the death revive options set for the group (DeathReviveSteps kills the player in the forest with a real enemy
 * hit, the death teleport enabled unless overridden): without the auto revive the revive button revives the player in
 * the town room, or where it died consuming the automatically consumed restoration item; the asked restoration item
 * never answered revives the player in the town room at the game over time keeping the item, and kept without the auto
 * revive the revive button revives it in the town room keeping the item; a player that dies in the town room itself
 * (the forest set as the teleport room, or as the players initial room with no teleport room set) is placed on that
 * room default return point and revived there; an unknown teleport room keeps the teleport disabled, so the player
 * revives where it died; an empty restoration item key revives the player carrying the item in the town room with the
 * item kept; a player carrying two restoration items consumes only one; with the teleport off the carried item is never
 * asked nor consumed (revived in place automatically or on request); and without the auto revive the unanswered item
 * question stays with the revive button, which revives the player in town keeping the item, while the item used after
 * the button appeared keeps the button and is consumed by the revive in place.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { RoomsConst } = require('../../lib/rooms/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathReviveOptions
{

    static CONFIG_PATHS = ActionsConst.DEATH.CONFIG_PATHS;
    static INITIAL_ROOM_PATH = 'server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH;
    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};

    static async loadForestRoom(gameConfig)
    {
        return [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {name: Login.FOREST_ROOM_NAME})].shift();
    }

    static async expectRevivedOnReturnPoint(context, forestRoom)
    {
        await DeathReviveSteps.expectGameOverMessage(
            context,
            DeathReviveSteps.DEATH_SNIPPETS.reviveInTown.replace('%townLabel', forestRoom.title),
            0
        );
        let revivedPlayer = await DeathReviveSteps.expectAliveInForest(context);
        let returnPoint = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'roomsReturnPoints', {
            room_id: forestRoom.id,
            is_default: 1
        })].shift();
        expect([revivedPlayer.x, revivedPlayer.y], 'Revived on the room default return point').toEqual(
            [Number(returnPoint.x), Number(returnPoint.y)]
        );
        await context.screenshots.capture(context.page, 'revived-on-the-room-return-point');
    }

    static async runManualTownReviveTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, DeathReviveSteps.MANUAL_REVIVE_CONFIG, 0);
        await DeathReviveSteps.expectReviveWait(context);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runManualConsumedItemReviveTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG,
            1
        );
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectItemConsumedInForest(context, restorationItemKey);
    }

    static async runUnansweredItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(context, {});
        await DeathReviveSteps.expectRevivedInTown(
            context,
            (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name
        );
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runManualKeptItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        );
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemKeepButton);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runDeathInTownRoomTest(context)
    {
        let forestRoom = await TestDeathReviveOptions.loadForestRoom(context.gameConfig);
        await DeathReviveSteps.killPlayerCarryingItems(
            context,
            {[TestDeathReviveOptions.CONFIG_PATHS.TELEPORT_ROOM_ID]: Number(forestRoom.id)},
            0
        );
        await TestDeathReviveOptions.expectRevivedOnReturnPoint(context, forestRoom);
    }

    static async runInitialRoomFallbackTest(context)
    {
        let forestRoom = await TestDeathReviveOptions.loadForestRoom(context.gameConfig);
        await DeathReviveSteps.killPlayerCarryingItems(context, {
            [TestDeathReviveOptions.CONFIG_PATHS.TELEPORT_ROOM_ID]: 0,
            [TestDeathReviveOptions.INITIAL_ROOM_PATH]: Number(forestRoom.id)
        }, 0);
        await TestDeathReviveOptions.expectRevivedOnReturnPoint(context, forestRoom);
    }

    static async runUnknownTownRoomTest(context)
    {
        let roomsIds = (await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'rooms', {})).map(room => Number(room.id));
        await DeathReviveSteps.killPlayerCarryingItems(
            context,
            {[TestDeathReviveOptions.CONFIG_PATHS.TELEPORT_ROOM_ID]: Math.max(...roomsIds) + 1},
            0
        );
        await DeathReviveSteps.expectGameOverMessage(context, DeathReviveSteps.DEATH_SNIPPETS.reviveInPlace, 0);
        await DeathReviveSteps.expectAliveInForest(context);
        await context.screenshots.capture(context.page, 'unknown-town-room-revived-where-it-died');
    }

    static async runEmptyItemKeyTest(context)
    {
        let restorationItemKey = await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            TestDeathReviveOptions.CONFIG_PATHS.RESTORATION_ITEM_KEY
        );
        await DeathReviveSteps.prepareDeath(context, {[TestDeathReviveOptions.CONFIG_PATHS.RESTORATION_ITEM_KEY]: ''});
        await DeathReviveSteps.seedRestorationItems(context, restorationItemKey, 1);
        await DeathReviveSteps.killPlayerInForest(
            context,
            await DeathReviveSteps.enterForest(context, true),
            'The player died carrying the item while no restoration item is configured'
        );
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runTeleportOffAskedItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            Object.assign({}, TestDeathReviveOptions.TELEPORT_OFF, DeathReviveSteps.ASKED_ITEM_CONFIG),
            1
        );
        await DeathReviveSteps.expectGameOverMessage(context, DeathReviveSteps.DEATH_SNIPPETS.reviveInPlace, 0);
        await expect(context.page.locator(Selectors.gameOver.restorationItemUseButton), 'No question').toHaveCount(0);
        await DeathReviveSteps.expectAliveInForest(context);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runTeleportOffManualItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            Object.assign({}, TestDeathReviveOptions.TELEPORT_OFF, DeathReviveSteps.MANUAL_REVIVE_CONFIG),
            1
        );
        await DeathReviveSteps.expectGameOverMessage(context, DeathReviveSteps.DEATH_SNIPPETS.reviveInPlace, 0);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectAliveInForest(context);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async killAskedReadyToRevive(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        );
        await expect(context.page.locator(Selectors.gameOver.reviveButton)).toBeVisible(
            {timeout: TimeConstants.PLAYER_REVIVE}
        );
        return restorationItemKey;
    }

    static async runUnansweredManualReviveTest(context)
    {
        let restorationItemKey = await TestDeathReviveOptions.killAskedReadyToRevive(context);
        await expect(context.page.locator(Selectors.gameOver.restorationItemUseButton), 'Question kept').toBeVisible();
        await expect(context.page.locator(Selectors.gameOver.restorationItemKeepButton)).toBeVisible();
        await context.screenshots.capture(context.page, 'question-and-revive-button-together');
        let townRoomName = (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name;
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runLateUseChoiceTest(context)
    {
        let restorationItemKey = await TestDeathReviveOptions.killAskedReadyToRevive(context);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await expect(context.page.locator(Selectors.gameOver.reviveButton), 'The revive button is kept').toBeVisible();
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectItemConsumedInForest(context, restorationItemKey);
    }

    static async runTwoItemsTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(context, {}, 2);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        expect((await DeathReviveSteps.expectAliveInForest(context)).life, 'The player is alive').toBeGreaterThan(0);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
        await context.screenshots.capture(context.page, 'one-of-two-items-consumed');
    }

    static run()
    {
        test.describe('Death Revive Options', () => {
            test('without auto revive the revive button revives the player in the town room', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runManualTownReviveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('without auto revive the revive button consumes the auto consumed item where the player died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runManualConsumedItemReviveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('asked restoration item never answered revives the player in town keeping the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runUnansweredItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('kept restoration item without auto revive revives the player in town keeping the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runManualKeptItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player that dies in the town room itself revives on its default return point', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runDeathInTownRoomTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('teleport room unset falls back to the players initial room', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runInitialRoomFallbackTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unknown teleport room keeps the teleport disabled and revives the player where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runUnknownTownRoomTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('empty restoration item key revives the player carrying the item in town keeping it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runEmptyItemKeyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player carrying two restoration items consumes only one', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runTwoItemsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('teleport off with the item asked revives in place with no question keeping the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runTeleportOffAskedItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('teleport off without auto revive revives in place on request never consuming the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runTeleportOffManualItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unanswered item question with the revive button revives in town keeping the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runUnansweredManualReviveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('item used after the revive button appeared keeps the button and consumes it in place', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveOptions.runLateUseChoiceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathReviveOptions.run();
