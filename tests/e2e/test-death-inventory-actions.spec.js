/**
 *
 * Reldens - Test Death Inventory Actions
 *
 * Tests the inventory messages sent by a dead player (DeathReviveSteps kills it in the forest with a real enemy hit, with
 * the death teleport and the automatic revive off, so the player stays dead until it asks for the revive): the player
 * that uses a consumable, equips or unequips an item, starts a trade with the other player in the forest or accepts the
 * trade request of that player stays dead; and with the death
 * teleport on, a restoration item removed while dead makes the death resolution use the real remaining quantity, so the
 * player revives in the town room instead of consuming the item.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { InventoryConst } = require('../../lib/inventory/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathInventoryActions
{

    static QUIET_MS = 1500;
    static MANUAL_IN_PLACE = Object.assign(
        {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
        DeathReviveSteps.MANUAL_REVIVE_CONFIG
    );

    static async sendAndWait(page, message)
    {
        await RoomMessagesRecorder.sendMessage(page, message);
        await page.waitForTimeout(TestDeathInventoryActions.QUIET_MS);
    }

    static async fetchSessionId(page)
    {
        return await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
    }

    static async runUseConsumableTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathInventoryActions.MANUAL_IN_PLACE, 0);
        await TestDeathInventoryActions.sendAndWait(
            context.page,
            {act: InventoryConst.ACTIONS.USE, idx: context.gameConfig.e2eConsumableItemId}
        );
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The player stays dead after using the consumable'
        ).toBe(GameConst.STATUS.DEATH);
    }

    static async runEquipActionTest(context, storedAsEquipped)
    {
        let equipmentKey = context.gameConfig.e2eEquipableItemId;
        await E2eSeedAndRestoreApi.updateWithPreserve(
            context.gameConfig,
            context.e2eGroup,
            'itemsInventory',
            await E2eSeedAndRestoreApi.fetchInventoryFilters(
                context.gameConfig,
                context.gameConfig.e2ePlayerName,
                equipmentKey
            ),
            {is_active: storedAsEquipped ? 1 : 0}
        );
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathInventoryActions.MANUAL_IN_PLACE, 0);
        await TestDeathInventoryActions.sendAndWait(
            context.page,
            {act: InventoryConst.ACTIONS.EQUIP, idx: equipmentKey}
        );
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The player stays dead after the equipment action'
        ).toBe(GameConst.STATUS.DEATH);
    }

    static async runRemoveRestorationItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(context, {}, 1);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await RoomMessagesRecorder.sendMessage(
            context.page,
            {act: InventoryConst.ACTIONS.REMOVE, idx: restorationItemKey}
        );
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(
                context.gameConfig,
                context.gameConfig.e2ePlayerName,
                restorationItemKey
            ),
            {message: 'The restoration item is removed', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
        await DeathReviveSteps.expectRevivedInTown(
            context,
            (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name
        );
    }

    static async killNextToTradePartner(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathInventoryActions.MANUAL_IN_PLACE, 0);
        test.setTimeout(
            test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
        );
        await Login.loginAndEnterForest(
            context.secondPage,
            Login.fetchSecondPlayerConfig(context.gameConfig),
            context.longRun
        );
        await RoomMessagesRecorder.start(context.secondPage);
        await RoomMessagesRecorder.start(context.page);
        return {
            deadSessionId: await TestDeathInventoryActions.fetchSessionId(context.page),
            partnerSessionId: await TestDeathInventoryActions.fetchSessionId(context.secondPage)
        };
    }

    static async runTradeStartTest(context)
    {
        let sessionIds = await TestDeathInventoryActions.killNextToTradePartner(context);
        await TestDeathInventoryActions.sendAndWait(
            context.page,
            {act: InventoryConst.ACTIONS.TRADE_START, id: sessionIds.partnerSessionId}
        );
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The player stays dead after starting the trade'
        ).toBe(GameConst.STATUS.DEATH);
    }

    static async runTradeAcceptTest(context)
    {
        let sessionIds = await TestDeathInventoryActions.killNextToTradePartner(context);
        await RoomMessagesRecorder.sendMessage(
            context.secondPage,
            {act: InventoryConst.ACTIONS.TRADE_START, id: sessionIds.deadSessionId}
        );
        await RoomMessagesRecorder.waitForMessage(
            context.page,
            InventoryConst.ACTIONS.TRADE_START,
            TimeConstants.SERVER_RESPONSE
        );
        await TestDeathInventoryActions.sendAndWait(
            context.page,
            {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, value: '1', id: sessionIds.partnerSessionId}
        );
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The player stays dead after accepting the trade'
        ).toBe(GameConst.STATUS.DEATH);
    }

    static run()
    {
        test.describe('Death Inventory Actions', () => {
            test('dead player using a consumable stays dead', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathInventoryActions.runUseConsumableTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player equipping an item stays dead', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathInventoryActions.runEquipActionTest({page, screenshots, gameConfig, e2eGroup, longRun}, false);
            });
            test('dead player unequipping an item stays dead', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathInventoryActions.runEquipActionTest({page, screenshots, gameConfig, e2eGroup, longRun}, true);
            });
            test('dead player removing its restoration item revives in the town room', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathInventoryActions.runRemoveRestorationItemTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('dead player starting a trade stays dead', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathInventoryActions.runTradeStartTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('dead player accepting a trade stays dead', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathInventoryActions.runTradeAcceptTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathInventoryActions.run();
