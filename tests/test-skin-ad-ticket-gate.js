/**
 *
 * Reldens - Test Skin Ad Ticket Gate
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { SkinAdTicketGate } = require('../lib/users/server/skin-ad-ticket-gate');
const { UsersConst } = require('../lib/users/constants');
const { InventoryConst } = require('../lib/inventory/constants');
const { AdsConst } = require('../lib/ads/constants');

class TestSkinAdTicketGate extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.skinAdId = 8;
        this.otherAdId = 7;
        this.ticketItemKey = 'skin_ad_ticket';
    }

    createGate(configValues = {})
    {
        return new SkinAdTicketGate({
            config: GameplayPlayerBuilder.createConfig(Object.assign({
                [UsersConst.SKINS.CONFIG_PATHS.ADS_KEY]: 'skin-ad-ticket',
                [UsersConst.SKINS.CONFIG_PATHS.AD_TICKET_ITEM_KEY]: this.ticketItemKey,
                [AdsConst.CONFIG_PATHS.COLLECTION]: {
                    [this.skinAdId]: {id: this.skinAdId, key: 'skin-ad-ticket', enabled: 1, provider: {enabled: 1}},
                    [this.otherAdId]: {id: this.otherAdId, key: 'other-video', enabled: 1, provider: {enabled: 1}}
                }
            }, configValues))
        });
    }

    createEvent(messageData, ticketQty)
    {
        let items = {potion: GameplayPlayerBuilder.createItem('potion')};
        if(0 <= ticketQty){
            items[this.ticketItemKey] = GameplayPlayerBuilder.createItem(this.ticketItemKey, {qty: ticketQty});
        }
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
        playerSchema.inventory = {manager: GameplayPlayerBuilder.createInventoryManager(items)};
        return {messageData, playerSchema, client: GameplayPlayerBuilder.createClient(), canContinue: true};
    }

    createRewardEvent(playedAdKey, ticketQty)
    {
        let event = this.createEvent({}, ticketQty);
        return {playedAd: {key: playedAdKey}, playerSchema: event.playerSchema, continueEvent: true};
    }

    async testTicketUseRequestsTheSkinAd()
    {
        await this.test('using the skin ticket requests the skin ad instead of the item use', async () => {
            let event = this.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 1);
            this.assert.strictEqual(await this.createGate().onBeforeSceneExecuteMessages(event), true);
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
            let gate = this.createGate();
            let otherItemEvent = this.createEvent({act: InventoryConst.ACTIONS.USE, idx: 'potion'}, 1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(otherItemEvent), false);
            this.assert.strictEqual(otherItemEvent.canContinue, true);
            this.assert.deepStrictEqual(otherItemEvent.client.sentMessages, []);
            let withoutTicketEvent = this.createEvent({act: InventoryConst.ACTIONS.USE, idx: 'potion'}, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(withoutTicketEvent), false);
            this.assert.strictEqual(withoutTicketEvent.canContinue, true);
            this.assert.deepStrictEqual(withoutTicketEvent.client.sentMessages, []);
        });
    }

    async testEmptyTicketOrUnavailableAdSendsNothing()
    {
        await this.test('an empty ticket or an unavailable skin ad blocks the use and sends nothing', async () => {
            let emptyTicketEvent = this.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 0);
            this.assert.strictEqual(await this.createGate().onBeforeSceneExecuteMessages(emptyTicketEvent), false);
            this.assert.strictEqual(emptyTicketEvent.canContinue, false);
            this.assert.deepStrictEqual(emptyTicketEvent.client.sentMessages, []);
            let missingAdGate = this.createGate({[UsersConst.SKINS.CONFIG_PATHS.ADS_KEY]: 'missing-video'});
            let unavailableAdEvent = this.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 1);
            this.assert.strictEqual(await missingAdGate.onBeforeSceneExecuteMessages(unavailableAdEvent), false);
            this.assert.strictEqual(unavailableAdEvent.canContinue, false);
            this.assert.deepStrictEqual(unavailableAdEvent.client.sentMessages, []);
        });
    }

    async testSkinAdStartRequiresATicket()
    {
        await this.test('the skin ad start is accepted only with a ticket and never consumes it', async () => {
            let gate = this.createGate();
            let adStartData = {act: AdsConst.ACTIONS.AD_STARTED, ads_id: this.skinAdId};
            let withTicketEvent = this.createEvent(adStartData, 1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(withTicketEvent), true);
            this.assert.strictEqual(withTicketEvent.canContinue, true);
            this.assert.deepStrictEqual(withTicketEvent.playerSchema.inventory.manager.decreasedItems, []);
            let withoutTicketEvent = this.createEvent(adStartData, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(withoutTicketEvent), false);
            this.assert.strictEqual(withoutTicketEvent.canContinue, false);
            let emptyTicketEvent = this.createEvent(adStartData, 0);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(emptyTicketEvent), false);
            this.assert.strictEqual(emptyTicketEvent.canContinue, false);
        });
    }

    async testOtherAdStartAndMessagesAreNotGated()
    {
        await this.test('the other ads starts and the other messages are not gated', async () => {
            let gate = this.createGate();
            let otherAdEvent = this.createEvent({act: AdsConst.ACTIONS.AD_STARTED, ads_id: this.otherAdId}, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(otherAdEvent), false);
            this.assert.strictEqual(otherAdEvent.canContinue, true);
            let otherMessageEvent = this.createEvent({act: AdsConst.ACTIONS.AD_ENDED, ads_id: this.skinAdId}, -1);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(otherMessageEvent), false);
            this.assert.strictEqual(otherMessageEvent.canContinue, true);
        });
    }

    async testSkinAdRewardConsumesOneTicket()
    {
        await this.test('the skin ad reward consumes one ticket', async () => {
            let rewardEvent = this.createRewardEvent('skin-ad-ticket', 2);
            this.assert.strictEqual(await this.createGate().onBeforeGiveAdRewardItem(rewardEvent), true);
            this.assert.strictEqual(rewardEvent.continueEvent, true);
            let inventoryManager = rewardEvent.playerSchema.inventory.manager;
            this.assert.deepStrictEqual(inventoryManager.decreasedItems, [{inventoryId: this.ticketItemKey, qty: 1}]);
            this.assert.strictEqual(inventoryManager.items[this.ticketItemKey].qty, 1);
        });
    }

    async testSkinAdRewardWithoutTicketIsCanceled()
    {
        await this.test('the skin ad reward of a player without ticket or with an empty one is canceled', async () => {
            let gate = this.createGate();
            let withoutTicketEvent = this.createRewardEvent('skin-ad-ticket', -1);
            this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(withoutTicketEvent), false);
            this.assert.strictEqual(withoutTicketEvent.continueEvent, false);
            let emptyTicketEvent = this.createRewardEvent('skin-ad-ticket', 0);
            this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(emptyTicketEvent), false);
            this.assert.strictEqual(emptyTicketEvent.continueEvent, false);
            this.assert.deepStrictEqual(emptyTicketEvent.playerSchema.inventory.manager.decreasedItems, []);
        });
    }

    async testOtherAdRewardIsNotChanged()
    {
        await this.test('the reward of another ad keeps going and consumes no ticket', async () => {
            let rewardEvent = this.createRewardEvent('other-video', 1);
            this.assert.strictEqual(await this.createGate().onBeforeGiveAdRewardItem(rewardEvent), false);
            this.assert.strictEqual(rewardEvent.continueEvent, true);
            this.assert.deepStrictEqual(rewardEvent.playerSchema.inventory.manager.decreasedItems, []);
        });
    }

    async testMissingTicketItemKeyFindsNoTicket()
    {
        await this.test('without the ticket item key config no ticket is found', async () => {
            let gate = this.createGate({[UsersConst.SKINS.CONFIG_PATHS.AD_TICKET_ITEM_KEY]: ''});
            let event = this.createEvent({act: InventoryConst.ACTIONS.USE, idx: this.ticketItemKey}, 1);
            this.assert.strictEqual(gate.findTicketItem(event.playerSchema), false);
            this.assert.strictEqual(gate.findTicketItem(false), false);
        });
    }

}

module.exports.TestSkinAdTicketGate = TestSkinAdTicketGate;
