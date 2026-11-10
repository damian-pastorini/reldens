/**
 *
 * Reldens - Test Skin Ad Ticket Gate
 *
 */

const { BaseTest } = require('./base-test');
const { SkinAdTicketGateBuilder } = require('./fixtures/skin-ad-ticket-gate-builder');
const { UsersConst } = require('../lib/users/constants');
const { InventoryConst } = require('../lib/inventory/constants');
const { AdsConst } = require('../lib/ads/constants');
const { MessageFactory } = require('../lib/chat/message-factory');
const { ChatConst } = require('../lib/chat/constants');

class TestSkinAdTicketGate extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.skinAdId = SkinAdTicketGateBuilder.SKIN_AD_ID;
        this.otherAdId = SkinAdTicketGateBuilder.OTHER_AD_ID;
        this.ticketItemKey = SkinAdTicketGateBuilder.TICKET_ITEM_KEY;
    }

    async testTicketUseRequestsTheSkinAd()
    {
        await this.test('using the skin ticket requests the skin ad instead of the item use', async () => {
            let event = SkinAdTicketGateBuilder.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 1);
            this.assert.strictEqual(await SkinAdTicketGateBuilder.createGate().onBeforeSceneExecuteMessages(event), true);
            this.assert.strictEqual(event.canContinue, false);
            this.assert.deepStrictEqual(
                event.client.sentMessages,
                [{act: UsersConst.SKINS.ACTIONS.AD_START, adsId: this.skinAdId}]
            );
            this.assert.strictEqual(event.playerSchema.inventory.manager.items[this.ticketItemKey].qty, 1);
            this.assert.deepStrictEqual(event.playerSchema.inventory.manager.decreasedItems, []);
        });
    }

    async testOtherItemsAndPlayersWithoutTicketUseItemsNormally()
    {
        await this.test('using another item or using items without a ticket keeps the normal use', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let otherItemEvent = SkinAdTicketGateBuilder.createEvent({act: InventoryConst.ACTIONS.USE, idx: 'potion'}, 1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(otherItemEvent), false);
            this.assert.strictEqual(otherItemEvent.canContinue, true);
            this.assert.deepStrictEqual(otherItemEvent.client.sentMessages, []);
            let withoutTicketEvent = SkinAdTicketGateBuilder.createEvent({act: InventoryConst.ACTIONS.USE, idx: 'potion'}, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(withoutTicketEvent), false);
            this.assert.strictEqual(withoutTicketEvent.canContinue, true);
            this.assert.deepStrictEqual(withoutTicketEvent.client.sentMessages, []);
        });
    }

    async testEmptyTicketOrUnavailableAdSendsNothing()
    {
        await this.test('an empty ticket or an unavailable skin ad blocks the use and sends nothing', async () => {
            let emptyTicketEvent = SkinAdTicketGateBuilder.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 0);
            this.assert.strictEqual(await SkinAdTicketGateBuilder.createGate().onBeforeSceneExecuteMessages(emptyTicketEvent), false);
            this.assert.strictEqual(emptyTicketEvent.canContinue, false);
            this.assert.deepStrictEqual(emptyTicketEvent.client.sentMessages, []);
            let missingAdGate = SkinAdTicketGateBuilder.createGate({[UsersConst.SKINS.CONFIG_PATHS.ADS_KEY]: 'missing-video'});
            let unavailableAdEvent = SkinAdTicketGateBuilder.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 1);
            this.assert.strictEqual(await missingAdGate.onBeforeSceneExecuteMessages(unavailableAdEvent), false);
            this.assert.strictEqual(unavailableAdEvent.canContinue, false);
            this.assert.deepStrictEqual(unavailableAdEvent.client.sentMessages, []);
        });
    }

    async testSkinAdStartRequiresATicket()
    {
        await this.test('the skin ad start is accepted only with a ticket and never consumes it', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let adStartData = {act: AdsConst.ACTIONS.AD_STARTED, ads_id: this.skinAdId};
            let withTicketEvent = SkinAdTicketGateBuilder.createEvent(adStartData, 1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(withTicketEvent), true);
            this.assert.strictEqual(withTicketEvent.canContinue, true);
            this.assert.deepStrictEqual(withTicketEvent.playerSchema.inventory.manager.decreasedItems, []);
            let withoutTicketEvent = SkinAdTicketGateBuilder.createEvent(adStartData, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(withoutTicketEvent), false);
            this.assert.strictEqual(withoutTicketEvent.canContinue, false);
            let emptyTicketEvent = SkinAdTicketGateBuilder.createEvent(adStartData, 0);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(emptyTicketEvent), false);
            this.assert.strictEqual(emptyTicketEvent.canContinue, false);
        });
    }

    async testOtherAdStartAndMessagesAreNotGated()
    {
        await this.test('the other ads starts and the other messages are not gated', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let otherAdEvent = SkinAdTicketGateBuilder.createEvent({act: AdsConst.ACTIONS.AD_STARTED, ads_id: this.otherAdId}, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(otherAdEvent), false);
            this.assert.strictEqual(otherAdEvent.canContinue, true);
            let otherMessageEvent = SkinAdTicketGateBuilder.createEvent({act: AdsConst.ACTIONS.AD_ENDED, ads_id: this.skinAdId}, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(otherMessageEvent), false);
            this.assert.strictEqual(otherMessageEvent.canContinue, true);
        });
    }

    async testSkinAdRewardReservesTheTicketBeforeItIsGiven()
    {
        await this.test('the ticket is removed before the reward and stays removed once the reward was given', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 2);
            let inventoryManager = rewardEvent.playerSchema.inventory.manager;
            this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(rewardEvent), true);
            this.assert.strictEqual(rewardEvent.continueEvent, true);
            this.assert.deepStrictEqual(inventoryManager.decreasedItems, [{inventoryId: this.ticketItemKey, qty: 1}]);
            this.assert.strictEqual(inventoryManager.items[this.ticketItemKey].qty, 1);
            this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, {id: 1})), false);
            this.assert.deepStrictEqual(inventoryManager.increasedItems, []);
            this.assert.strictEqual(inventoryManager.items[this.ticketItemKey].qty, 1);
            this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false)), false);
            this.assert.deepStrictEqual(inventoryManager.increasedItems, []);
        });
    }

    async testRefusedReservationCancelsTheReward()
    {
        await this.test('a ticket the locked inventory refuses to remove cancels the reward and gives nothing back', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 1);
            let inventoryManager = rewardEvent.playerSchema.inventory.manager;
            inventoryManager.decreaseItemQty = async () => false;
            this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(rewardEvent), false);
            this.assert.strictEqual(rewardEvent.continueEvent, false);
            this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false)), false);
            this.assert.deepStrictEqual(inventoryManager.increasedItems, []);
            this.assert.strictEqual(inventoryManager.items[this.ticketItemKey].qty, 1);
        });
    }

    async testFailedRewardGivesTheTicketBack()
    {
        await this.test('a failed reward gives the reserved ticket back to its stack only once', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 2);
            let inventoryManager = rewardEvent.playerSchema.inventory.manager;
            await gate.onBeforeGiveAdRewardItem(rewardEvent);
            this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false)), true);
            this.assert.deepStrictEqual(inventoryManager.increasedItems, [{inventoryId: this.ticketItemKey, qty: 1}]);
            this.assert.strictEqual(inventoryManager.items[this.ticketItemKey].qty, 2);
            this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false)), false);
            this.assert.strictEqual(inventoryManager.increasedItems.length, 1);
        });
    }

    async testFailedRewardRecreatesTheRemovedLastTicket()
    {
        await this.test('a failed reward creates the ticket again when the last one left the inventory', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let givenItems = [];
            gate.giveRewardAction = {
                execute: async (playerSchema, itemKey, qty) => {
                    givenItems.push({playerSchema, itemKey, qty});
                    return {key: itemKey};
                }
            };
            let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 1);
            let inventoryManager = rewardEvent.playerSchema.inventory.manager;
            await gate.onBeforeGiveAdRewardItem(rewardEvent);
            delete inventoryManager.items[this.ticketItemKey];
            this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false)), true);
            this.assert.deepStrictEqual(
                givenItems,
                [{playerSchema: rewardEvent.playerSchema, itemKey: this.ticketItemKey, qty: 1}]
            );
            this.assert.deepStrictEqual(inventoryManager.increasedItems, []);
        });
    }

    async testRefusedOrRejectedTicketReleaseIsCaught()
    {
        await this.test('a refused or rejected ticket release returns false and never throws', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            for(let increaseItemQty of [async () => false, async () => Promise.reject({message: 'Storage.'})]){
                let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 2);
                await gate.onBeforeGiveAdRewardItem(rewardEvent);
                rewardEvent.playerSchema.inventory.manager.increaseItemQty = increaseItemQty;
                this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false)), false);
            }
        });
    }

    async testOtherAdEndedDoesNotReleaseTheReservedTicket()
    {
        await this.test('another ad that ends without reward does not give back the reserved skin ticket', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 2);
            let inventoryManager = rewardEvent.playerSchema.inventory.manager;
            await gate.onBeforeGiveAdRewardItem(rewardEvent);
            let otherAdEvent = SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false, this.otherAdId);
            this.assert.strictEqual(await gate.onAfterAdEnded(otherAdEvent), false);
            this.assert.deepStrictEqual(inventoryManager.increasedItems, []);
            this.assert.strictEqual(await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, false)), true);
            this.assert.strictEqual(inventoryManager.increasedItems.length, 1);
        });
    }

    async testSkinAdRewardWithoutTicketIsCanceled()
    {
        await this.test('the skin ad reward of a player without ticket or with an empty one is canceled', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let withoutTicketEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', -1);
            this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(withoutTicketEvent), false);
            this.assert.strictEqual(withoutTicketEvent.continueEvent, false);
            let emptyTicketEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 0);
            this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(emptyTicketEvent), false);
            this.assert.strictEqual(emptyTicketEvent.continueEvent, false);
            this.assert.deepStrictEqual(emptyTicketEvent.playerSchema.inventory.manager.decreasedItems, []);
        });
    }

    async testOtherAdRewardIsNotChanged()
    {
        await this.test('the reward of another ad keeps going and consumes no ticket', async () => {
            let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('other-video', 1);
            this.assert.strictEqual(await SkinAdTicketGateBuilder.createGate().onBeforeGiveAdRewardItem(rewardEvent), false);
            this.assert.strictEqual(rewardEvent.continueEvent, true);
            this.assert.deepStrictEqual(rewardEvent.playerSchema.inventory.manager.decreasedItems, []);
        });
    }

    async testMissingTicketItemKeyFindsNoTicket()
    {
        await this.test('without the ticket item key config no ticket is found', async () => {
            let gate = SkinAdTicketGateBuilder.createGate({[UsersConst.SKINS.CONFIG_PATHS.AD_TICKET_ITEM_KEY]: ''});
            let event = SkinAdTicketGateBuilder.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 1);
            this.assert.strictEqual(gate.findTicketItem(event.playerSchema), false);
            this.assert.strictEqual(gate.findTicketItem(false), false);
        });
    }

    async testFailedSkinAdTellsThePlayerTheTicketWasKept()
    {
        await this.test('a failed skin ad tells the player the ticket was kept, other failed ads tell nothing', async () => {
            let skinAdFailedData = {act: AdsConst.ACTIONS.AD_FAILED, ads_id: this.skinAdId};
            let skinAdEvent = SkinAdTicketGateBuilder.createEvent(skinAdFailedData, 1);
            this.assert.strictEqual(await SkinAdTicketGateBuilder.createGate().onBeforeSceneExecuteMessages(skinAdEvent), true);
            this.assert.deepStrictEqual(
                skinAdEvent.client.sentMessages,
                [MessageFactory.create(ChatConst.TYPES.ERROR, UsersConst.SNIPPETS.SKIN_AD_FAILED)]
            );
            this.assert.strictEqual(skinAdEvent.canContinue, true);
            this.assert.strictEqual(skinAdEvent.playerSchema.inventory.manager.items[this.ticketItemKey].qty, 1);
            this.assert.deepStrictEqual(skinAdEvent.playerSchema.inventory.manager.decreasedItems, []);
            let notToldCases = [
                {gate: SkinAdTicketGateBuilder.createGate(), messageData: {act: AdsConst.ACTIONS.AD_FAILED, ads_id: this.otherAdId}},
                {
                    gate: SkinAdTicketGateBuilder.createGate({[UsersConst.SKINS.CONFIG_PATHS.ADS_KEY]: 'missing-video'}),
                    messageData: skinAdFailedData
                }
            ];
            for(let notToldCase of notToldCases){
                let notToldEvent = SkinAdTicketGateBuilder.createEvent(notToldCase.messageData, 1);
                this.assert.strictEqual(await notToldCase.gate.onBeforeSceneExecuteMessages(notToldEvent), false);
                this.assert.deepStrictEqual(notToldEvent.client.sentMessages, []);
                this.assert.strictEqual(notToldEvent.canContinue, true);
            }
        });
    }

}

module.exports.TestSkinAdTicketGate = TestSkinAdTicketGate;
