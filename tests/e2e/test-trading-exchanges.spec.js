/**
 *
 * Reldens - Test Trading Exchanges
 *
 * Tests the completed trades between the group players (TradeSteps: the trade messages sent as a client sends them,
 * the live inventories read from the server and the stored inventory rows, the inventories of the players restored for
 * the group): one unit of a potions stack (a trade of more units merges only one, ISSUE #148) moves from the sender to
 * the receiver and merges into its stack, live, stored and
 * after the receiver logs in again, and both trade boxes close; the whole axe offered leaves the sender while a partial
 * potions stack stays; both players offer and swap their items; after a completed trade both inventories are unlocked,
 * the received potion is usable and a second trade between the same players completes; non stackable items offered
 * with a quantity above 1 leave the sender (the receiver gets only one instance, ISSUE #150); both confirmations on an
 * empty trade move nothing; both players confirming at the same time move the offer once (a receiver confirming twice in
 * the same tick moves it twice, ISSUE #151); and when a sender confirms and leaves before the receiver confirms, the
 * receiver live and stored quantities match (the trade still completes and duplicates the item, ISSUE #152).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { Login } = require('./helpers/login');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { InventoryConst } = require('../../lib/inventory/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTradingExchanges
{

    static OFFERED_QUANTITY = 1;
    static NON_STACKABLE_ITEM_KEY = 'branch';
    static NON_STACKABLE_QUANTITY = 3;
    static NON_STACKABLE_OFFERED = 2;

    static async enter(context, playersCount = 2, seededItems = [])
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        return await TradeSteps.enterPlayers(context, playersCount, seededItems);
    }

    static async fetchQuantities(context, players, itemKey)
    {
        let quantities = [];
        for(let player of players){
            quantities.push(await TradeSteps.fetchQuantity(context, player, itemKey));
        }
        return quantities;
    }

    static async offerPotions(context, sender, receiver)
    {
        let potionId = await TradeSteps.fetchItemId(context, sender, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offerAndConfirm(context, sender, receiver, potionId, TestTradingExchanges.OFFERED_QUANTITY);
    }

    static async expectPotionsMoved(context, sender, receiver, startQuantities, message)
    {
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let offered = TestTradingExchanges.OFFERED_QUANTITY;
        await TradeSteps.expectQuantity(context, sender, potionKey, startQuantities[0] - offered, message+': sender');
        await TradeSteps.expectQuantity(context, receiver, potionKey, startQuantities[1] + offered, message+': receiver');
    }

    static async openPotionsOffer(context, sender, receiver)
    {
        let startQuantities = await TestTradingExchanges.fetchQuantities(
            context,
            [sender, receiver],
            context.gameConfig.e2eConsumableItemId
        );
        await TradeSteps.open(sender, receiver);
        await TestTradingExchanges.offerPotions(context, sender, receiver);
        return startQuantities;
    }

    static async completePotionsTrade(context, sender, receiver, message)
    {
        let startQuantities = await TestTradingExchanges.openPotionsOffer(context, sender, receiver);
        await TradeSteps.confirm(receiver, sender);
        await TestTradingExchanges.expectPotionsMoved(context, sender, receiver, startQuantities, message);
        return startQuantities;
    }

    static async runPartialStackTest(context)
    {
        let [sender, receiver] = await TestTradingExchanges.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let startQuantities = await TestTradingExchanges.completePotionsTrade(context, sender, receiver, 'Potions move');
        let receiverItems = (await TradeSteps.fetchState(context, receiver)).items;
        expect(
            Object.keys(receiverItems).filter(inventoryId => potionKey === receiverItems[inventoryId].key).length,
            'The received potions merge into the receiver stack'
        ).toBe(1);
        let offered = TestTradingExchanges.OFFERED_QUANTITY;
        await TradeSteps.expectStoredQuantity(context, sender, potionKey, startQuantities[0] - offered, 'Sender stored');
        await TradeSteps.expectStoredQuantity(context, receiver, potionKey, startQuantities[1] + offered, 'Receiver stored');
        await expect(sender.page.locator('#box-trade'+receiver.sessionId), 'The sender box closes').toBeHidden();
        await expect(receiver.page.locator('#box-trade'+sender.sessionId), 'The receiver box closes').toBeHidden();
        await receiver.page.reload();
        await Login.loginRootPlayer(receiver.page, context.gameConfig, context.longRun, '2');
        await TradeSteps.expectQuantity(context, receiver, potionKey, startQuantities[1] + offered, 'Kept after login');
    }

    static async runWholeItemTest(context)
    {
        let [sender, receiver] = await TestTradingExchanges.enter(context);
        let axeKey = context.gameConfig.e2eEquipableItemId;
        let startAxes = await TestTradingExchanges.fetchQuantities(context, [sender, receiver], axeKey);
        await TradeSteps.open(sender, receiver);
        let axeId = await TradeSteps.fetchItemId(context, sender, axeKey);
        let potionId = await TradeSteps.fetchItemId(context, sender, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(sender, receiver, axeId, startAxes[0]);
        await TradeSteps.offer(sender, receiver, potionId, TestTradingExchanges.OFFERED_QUANTITY);
        await TradeSteps.expectOffered(
            context,
            sender,
            {[axeId]: startAxes[0], [potionId]: TestTradingExchanges.OFFERED_QUANTITY},
            'The whole axe and part of the potions are offered'
        );
        await TradeSteps.confirm(sender, receiver);
        await TradeSteps.expectConfirmed(context, sender, true, 'The sender confirms');
        await TradeSteps.confirm(receiver, sender);
        await TradeSteps.expectQuantity(context, receiver, axeKey, startAxes[0] + startAxes[1], 'The receiver gets the axe');
        let senderItems = (await TradeSteps.fetchState(context, sender)).items;
        expect(senderItems[axeId], 'The whole axe stack leaves the sender inventory').toBeUndefined();
        expect(
            Object.keys(senderItems).map(inventoryId => senderItems[inventoryId].key),
            'The partial potions stack stays'
        ).toContain(context.gameConfig.e2eConsumableItemId);
    }

    static async runSwapTest(context)
    {
        let [sender, receiver] = await TestTradingExchanges.enter(context);
        let axeKey = context.gameConfig.e2eEquipableItemId;
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let startAxes = await TestTradingExchanges.fetchQuantities(context, [sender, receiver], axeKey);
        let startPotions = await TestTradingExchanges.fetchQuantities(context, [sender, receiver], potionKey);
        await TradeSteps.open(sender, receiver);
        await TradeSteps.offer(sender, receiver, await TradeSteps.fetchItemId(context, sender, axeKey), 1);
        let receiverPotionId = await TradeSteps.fetchItemId(context, receiver, potionKey);
        await TradeSteps.offer(receiver, sender, receiverPotionId, TestTradingExchanges.OFFERED_QUANTITY);
        await TradeSteps.expectOffered(context, receiver, {[receiverPotionId]: TestTradingExchanges.OFFERED_QUANTITY}, 'Offered');
        await TradeSteps.confirm(sender, receiver);
        await TradeSteps.expectConfirmed(context, sender, true, 'The sender confirms');
        await TradeSteps.confirm(receiver, sender);
        await TestTradingExchanges.expectPotionsMoved(context, receiver, sender, [...startPotions].reverse(), 'Potions swapped');
        await TradeSteps.expectQuantity(context, receiver, axeKey, startAxes[1] + 1, 'The receiver gets the axe');
        await TradeSteps.expectQuantity(context, sender, axeKey, startAxes[0] - 1, 'The sender gives the axe');
    }

    static async runSecondTradeTest(context)
    {
        let [sender, receiver] = await TestTradingExchanges.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let startQuantities = await TestTradingExchanges.completePotionsTrade(context, sender, receiver, 'First trade');
        await TradeSteps.expectLocked(context, sender, false, 'The sender inventory is unlocked');
        await TradeSteps.expectLocked(context, receiver, false, 'The receiver inventory is unlocked');
        let receivedQuantity = startQuantities[1] + TestTradingExchanges.OFFERED_QUANTITY;
        await TradeSteps.sendItemAction(context, receiver, InventoryConst.ACTIONS.USE, potionKey);
        await TradeSteps.expectQuantity(context, receiver, potionKey, receivedQuantity - 1, 'The received potion is usable');
        for(let player of [sender, receiver]){
            await RoomMessagesRecorder.start(player.page);
        }
        await TradeSteps.open(sender, receiver);
        await TestTradingExchanges.offerPotions(context, sender, receiver);
        await TradeSteps.confirm(receiver, sender);
        await TestTradingExchanges.expectPotionsMoved(
            context,
            sender,
            receiver,
            [startQuantities[0] - TestTradingExchanges.OFFERED_QUANTITY, receivedQuantity - 1],
            'Second trade'
        );
    }

    static async runSeparateInstancesTest(context)
    {
        let itemKey = TestTradingExchanges.NON_STACKABLE_ITEM_KEY;
        let [sender, receiver] = await TestTradingExchanges.enter(context, 2, [
            {playerIndex: 0, itemKey, qty: TestTradingExchanges.NON_STACKABLE_QUANTITY}
        ]);
        await TradeSteps.open(sender, receiver);
        let itemId = await TradeSteps.fetchItemId(context, sender, itemKey);
        await TradeSteps.offerAndConfirm(context, sender, receiver, itemId, TestTradingExchanges.NON_STACKABLE_OFFERED);
        await TradeSteps.confirm(receiver, sender);
        let expectedLeft = TestTradingExchanges.NON_STACKABLE_QUANTITY - TestTradingExchanges.NON_STACKABLE_OFFERED;
        await TradeSteps.expectQuantity(context, sender, itemKey, expectedLeft, 'The sender keeps the rest');
    }

    static async runEmptyConfirmTest(context)
    {
        let [sender, receiver] = await TestTradingExchanges.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let axeKey = context.gameConfig.e2eEquipableItemId;
        let startPotions = await TestTradingExchanges.fetchQuantities(context, [sender, receiver], potionKey);
        let startAxes = await TestTradingExchanges.fetchQuantities(context, [sender, receiver], axeKey);
        await TradeSteps.open(sender, receiver);
        await TradeSteps.confirm(sender, receiver);
        await TradeSteps.expectConfirmed(context, sender, true, 'The sender confirms the empty trade');
        await TradeSteps.confirm(receiver, sender);
        await expect(sender.page.locator('#box-trade'+receiver.sessionId), 'The empty trade ends').toBeHidden({
            timeout: TimeConstants.SERVER_RESPONSE
        });
        expect(await TestTradingExchanges.fetchQuantities(context, [sender, receiver], potionKey), 'No potion moved')
            .toEqual(startPotions);
        expect(await TestTradingExchanges.fetchQuantities(context, [sender, receiver], axeKey), 'No axe moved')
            .toEqual(startAxes);
    }

    static async runSimultaneousConfirmTest(context)
    {
        let [sender, receiver] = await TestTradingExchanges.enter(context);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        let startQuantities = await TestTradingExchanges.fetchQuantities(context, [sender, receiver], potionKey);
        await TradeSteps.open(sender, receiver);
        let potionId = await TradeSteps.fetchItemId(context, sender, potionKey);
        await TradeSteps.offer(sender, receiver, potionId, TestTradingExchanges.OFFERED_QUANTITY);
        await TradeSteps.expectOffered(context, sender, {[potionId]: TestTradingExchanges.OFFERED_QUANTITY}, 'Offered');
        await Promise.all([TradeSteps.confirm(sender, receiver), TradeSteps.confirm(receiver, sender)]);
        await TestTradingExchanges.expectPotionsMoved(context, sender, receiver, startQuantities, 'Moved once');
        await sender.page.waitForTimeout(TradeSteps.SETTLE_MS);
        await TestTradingExchanges.expectPotionsMoved(context, sender, receiver, startQuantities, 'Still moved once');
    }

    static async runConfirmAndLeaveTest(context)
    {
        let [receiver, , sender] = await TestTradingExchanges.enter(context, 3);
        let potionKey = context.gameConfig.e2eConsumableItemId;
        await TestTradingExchanges.openPotionsOffer(context, sender, receiver);
        await sender.page.close();
        await receiver.page.waitForTimeout(TradeSteps.SETTLE_MS);
        await TradeSteps.confirm(receiver, sender);
        await receiver.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await TradeSteps.fetchQuantity(context, receiver, potionKey), 'The receiver live and stored match')
            .toBe(await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, receiver.playerName, potionKey));
    }

    static run()
    {
        test.describe('Trading Exchanges', () => {
            test('partial stack moves and merges, stored and after login', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runPartialStackTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('whole item leaves the sender and a partial stack stays', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runWholeItemTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('both players offer and swap', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runSwapTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('inventories unlocked and a second trade completes', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runSecondTradeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('non stackable items offered leave the sender', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runSeparateInstancesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('empty trade confirmed by both moves nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runEmptyConfirmTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('simultaneous confirmations move the offer once', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runSimultaneousConfirmTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('sender confirming and leaving keeps the receiver live and stored quantities matched', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingExchanges.runConfirmAndLeaveTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTradingExchanges.run();
