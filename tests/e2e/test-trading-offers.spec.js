/**
 *
 * Reldens - Test Trading Offers
 *
 * Tests the offers and the cancels of an open trade between the group players (TradeSteps: the trade messages sent as
 * a client sends them, the live trade state and items of each player and the stored inventory rows): a cancel by either
 * player, from the box message or the close button, closes the box of the other player, moves nothing and unlocks both
 * inventories; an offered item is removed with its remove button; the offers and removes after a confirmation are
 * rejected; zero, negative, decimal, over the owned quantity and missing item offers are rejected; trade actions with
 * no open trade or an unknown sub action send nothing; the equipped items are not listed (a tampered offer of an
 * equipped item is accepted, ISSUE #158; an offered item can be equipped and stays offered, ISSUE #159); the locked
 * inventory rejects a trash and a consumable used during the trade is not consumed (it still heals, ISSUE #160); an item
 * given
 * during the trade is
 * rejected by the lock; an action with the session of a third player sends that player nothing (a partner that leaves
 * keeps the remaining inventory locked, ISSUE #162); and a player that reloads during the trade logs in with an
 * unlocked inventory.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { Login } = require('./helpers/login');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { InventoryConst } = require('../../lib/inventory/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTradingOffers
{

    static MISSING_ITEM_ID = 'e2e-missing-item';
    static UNKNOWN_SUB_ACTION = 'e2e-unknown';
    static GIVEN_ITEM_KEY = 'branch';
    static HURT_LIFE = 10;

    static async enter(context, playersCount = 2)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        return await TradeSteps.enterPlayers(context, playersCount);
    }

    static async openWithPotionOffer(context, starter, partner)
    {
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let quantities = [
            await TradeSteps.fetchQuantity(context, starter, potionKey),
            await TradeSteps.fetchQuantity(context, partner, potionKey)
        ];
        await TradeSteps.open(starter, partner);
        let potionId = await TradeSteps.fetchItemId(context, starter, potionKey);
        await TradeSteps.offer(starter, partner, potionId, 1);
        await TradeSteps.expectOffered(context, starter, {[potionId]: 1}, 'The potion is offered');
        return {potionKey, potionId, quantities};
    }

    static async expectCancelled(context, players, opened, message)
    {
        for(let index of [0, 1]){
            await TradeSteps.expectLocked(context, players[index], false, message+': unlocked');
            await TradeSteps.expectQuantity(context, players[index], opened.potionKey, opened.quantities[index], message+': kept');
        }
    }

    static async equipAxe(context, player)
    {
        let axeId = await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.EQUIP, context.gameConfig.e2eEquipableItemId);
        await expect.poll(
            async () => (await TradeSteps.fetchState(context, player)).items[axeId].equipped,
            {message: 'The axe is equipped', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        return axeId;
    }

    static async runCancelTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let opened = await TestTradingOffers.openWithPotionOffer(context, starter, partner);
        await TradeSteps.close(starter, partner);
        await expect(partner.page.locator('#box-trade'+starter.sessionId), 'The partner box closes').toBeHidden();
        await TestTradingOffers.expectCancelled(context, [starter, partner], opened, 'The cancel moves nothing');
        await TradeSteps.sendItemAction(context, starter, InventoryConst.ACTIONS.USE, opened.potionKey);
        await TradeSteps.expectQuantity(context, starter, opened.potionKey, opened.quantities[0] - 1, 'The potion is usable');
    }

    static async runCancelByPartnerTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let opened = await TestTradingOffers.openWithPotionOffer(context, starter, partner);
        await TradeSteps.confirm(starter, partner);
        await TradeSteps.expectConfirmed(context, starter, true, 'The starter confirms');
        await TradeSteps.close(partner, starter);
        await expect(starter.page.locator('#box-trade'+partner.sessionId), 'The starter box closes').toBeHidden();
        await TestTradingOffers.expectCancelled(context, [starter, partner], opened, 'The partner cancel moves nothing');
    }

    static async runCloseButtonTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let opened = await TestTradingOffers.openWithPotionOffer(context, starter, partner);
        await starter.page.locator('#box-close-trade'+partner.sessionId).click();
        await expect(partner.page.locator('#box-trade'+starter.sessionId), 'The partner box closes').toBeHidden();
        await TestTradingOffers.expectCancelled(context, [starter, partner], opened, 'The close button cancels');
    }

    static async runRemoveOfferTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let opened = await TestTradingOffers.openWithPotionOffer(context, starter, partner);
        await starter.page.locator('.pushed-to-trade .trade-item-'+opened.potionId+' .trade-action-remove').click();
        await TradeSteps.expectOffered(context, starter, {}, 'The remove button takes the item out of the offer');
    }

    static async runConfirmedLocksOffersTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let opened = await TestTradingOffers.openWithPotionOffer(context, starter, partner);
        await TradeSteps.confirm(partner, starter);
        await TradeSteps.expectConfirmed(context, partner, true, 'The partner confirms');
        let axeId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eEquipableItemId);
        await TradeSteps.offer(starter, partner, axeId, 1);
        await TradeSteps.sendAction(starter, partner, ObjectsConst.TRADE_ACTIONS.REMOVE, {itemId: opened.potionId});
        await starter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await TradeSteps.fetchOffer(context, starter), 'No offer change after a confirmation').toEqual({[opened.potionId]: 1});
    }

    static async runInvalidOffersTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let ownedQuantity = await TradeSteps.fetchQuantity(context, starter, potionKey);
        await TradeSteps.open(starter, partner);
        let potionId = await TradeSteps.fetchItemId(context, starter, potionKey);
        let invalidOffers = [[potionId, 0], [potionId, -1], [potionId, 1.5], [potionId, ownedQuantity + 1], [TestTradingOffers.MISSING_ITEM_ID, 1]];
        for(let invalidOffer of invalidOffers){
            await TradeSteps.offer(starter, partner, invalidOffer[0], invalidOffer[1]);
        }
        await starter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await TradeSteps.fetchOffer(context, starter), 'No invalid offer is kept').toEqual({});
    }

    static async runActionsWithoutTradeTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let potionId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(starter, partner, potionId, 1);
        await TradeSteps.expectNoTradeShow([starter, partner], 'An action with no trade sends nothing');
        await TradeSteps.open(starter, partner);
        await TradeSteps.sendAction(starter, partner, TestTradingOffers.UNKNOWN_SUB_ACTION, {itemId: potionId, qty: 1});
        await starter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(
            (await RoomMessagesRecorder.fetchMessages(starter.page, InventoryConst.ACTIONS.TRADE_SHOW)).length,
            'An unknown sub action sends no update'
        ).toBe(1);
    }

    static async runEquippedListTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let axeId = await TestTradingOffers.equipAxe(context, starter);
        await TradeSteps.open(starter, partner);
        let ownShow = [...await RoomMessagesRecorder.fetchMessages(starter.page, InventoryConst.ACTIONS.TRADE_SHOW)].pop();
        expect(Object.keys(ownShow.items), 'The equipped axe is not in the tradable list').not.toContain(axeId);
    }

    static async runLockedTrashTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let ownedQuantity = await TradeSteps.fetchQuantity(context, starter, potionKey);
        await TradeSteps.open(starter, partner);
        await TradeSteps.expectLocked(context, starter, true, 'The inventory is locked');
        await TradeSteps.sendItemAction(context, starter, InventoryConst.ACTIONS.REMOVE, potionKey);
        await starter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await TradeSteps.fetchQuantity(context, starter, potionKey), 'The locked inventory keeps the item').toBe(ownedQuantity);
    }

    static async runUseDuringTradeTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let ownedQuantity = await TradeSteps.fetchQuantity(context, starter, potionKey);
        let roomName = ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName;
        await GameplayE2eStateApi.setPlayerStats(context.gameConfig, roomName, starter.playerName, {hp: TestTradingOffers.HURT_LIFE});
        await TradeSteps.open(starter, partner);
        await TradeSteps.sendItemAction(context, starter, InventoryConst.ACTIONS.USE, potionKey);
        await starter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await TradeSteps.fetchQuantity(context, starter, potionKey), 'The locked potion is not consumed').toBe(ownedQuantity);
    }

    static async runItemGivenDuringTradeTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        await TradeSteps.open(starter, partner);
        let added = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/inventory/add-item', {
            roomName: ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName,
            playerName: starter.playerName,
            itemKey: TestTradingOffers.GIVEN_ITEM_KEY
        });
        expect(added.inventoryId, 'The lock rejects the given item').toBeUndefined();
        expect(await TradeSteps.fetchQuantity(context, starter, TestTradingOffers.GIVEN_ITEM_KEY), 'No item is added').toBe(0);
    }

    static async runThirdSessionActionTest(context)
    {
        let [starter, partner, third] = await TestTradingOffers.enter(context, 3);
        await TradeSteps.open(starter, partner);
        let potionId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(starter, third, potionId, 1);
        await TradeSteps.expectNoTradeShow([third], 'The third player gets no trade update');
        await expect(third.page.locator(Selectors.trade.sessionBoxes), 'The third player has no trade box').toHaveCount(0);
    }

    static async runReloadTest(context)
    {
        let [starter, partner] = await TestTradingOffers.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        await TradeSteps.open(partner, starter);
        await starter.page.reload();
        await Login.loginRootPlayer(starter.page, context.gameConfig, context.longRun);
        await TradeSteps.expectLocked(context, starter, false, 'The inventory is unlocked after the login');
        let ownedQuantity = await TradeSteps.fetchQuantity(context, starter, potionKey);
        await TradeSteps.sendItemAction(context, starter, InventoryConst.ACTIONS.USE, potionKey);
        await TradeSteps.expectQuantity(context, starter, potionKey, ownedQuantity - 1, 'The potion is usable');
    }

    static run()
    {
        test.describe('Trading Offers', () => {
            test('cancel closes the partner box and moves nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runCancelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancel by the invited player after a confirmation moves nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runCancelByPartnerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('close button cancels the trade', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runCloseButtonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('remove button takes the item out of the offer', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runRemoveOfferTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('offers and removes after a confirmation are rejected', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runConfirmedLocksOffersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('invalid quantities and missing items are not offered', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runInvalidOffersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('actions with no trade or an unknown sub action send nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runActionsWithoutTradeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipped items are not listed', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runEquippedListTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('locked inventory rejects a trash', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runLockedTrashTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('potion used during the trade is not consumed', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runUseDuringTradeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item given during the trade is rejected by the lock', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runItemGivenDuringTradeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('action with a third session sends that player nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runThirdSessionActionTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reload during the trade logs in with an unlocked inventory', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingOffers.runReloadTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTradingOffers.run();
