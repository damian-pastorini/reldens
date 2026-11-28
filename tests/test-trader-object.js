/**
 *
 * Reldens - Test Trader Object
 *
 */

const { BaseTest } = require('./base-test');
const { TraderObject } = require('../lib/objects/server/object/type/trader-object');
const { ObjectsManager } = require('../lib/objects/server/manager');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ObjectsConst } = require('../lib/objects/constants');
const { GameConst } = require('../lib/game/constants');
const { ItemsManager, ItemsDataGenerator, ItemsConst } = require('@reldens/items-system');
const { EventsManager, sc } = require('@reldens/utils');

class TestTraderObject extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.traderId = 10;
        this.interactionDistance = 64;
        this.playerState = {x: 100, y: 200};
        this.sampleItems = [
            {id: 1, key: 'coins', type: 3, group_id: null, label: 'Coins', qty_limit: 0, uses_limit: 1},
            {id: 4, key: 'axe', type: 4, group_id: 1, label: 'Axe', qty_limit: 0, uses_limit: 0}
        ];
        this.axeReward = {id: 1, object_id: 10, item_key: 'axe', reward_item_key: 'coins', reward_quantity: 2};
    }

    createTrader()
    {
        let trader = new TraderObject({
            events: {},
            config: {get: () => this.interactionDistance, getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {},
            client_key: 'merchant_1',
            id: this.traderId
        });
        trader.setupInteractionArea(false, this.playerState.x, this.playerState.y);
        return trader;
    }

    createEmptyInventoryRepository(loadedOwners)
    {
        return {
            loadByWithRelations: async (field, value) => {
                loadedOwners.push(value);
                return [];
            }
        };
    }

    async createInventory(ownerId, quantities)
    {
        let inventory = new ItemsManager({
            owner: {id: ownerId},
            eventsManager: new EventsManager(),
            itemsModelData: ItemsDataGenerator.itemsListMappedData({}, this.sampleItems.map(item => Object.assign({}, item)))
        });
        for(let itemKey of Object.keys(quantities)){
            await inventory.addItem(inventory.createItemInstance(itemKey, quantities[itemKey]));
        }
        return inventory;
    }

    async createRequiredRewardTrader(traderQuantities)
    {
        let trader = this.createTrader();
        trader.inventory = await this.createInventory(this.traderId, traderQuantities);
        let rewardRows = [Object.assign({reward_item_is_required: 1}, this.axeReward)];
        trader.dataServer = {getEntity: () => ({loadBy: async () => rewardRows})};
        await trader.enrichWithLoadedRewards();
        return trader;
    }

    async createSeller()
    {
        let seller = {
            sentMessages: [],
            playerSchema: Object.assign(GameplayPlayerBuilder.createPlayerSchema({physicalBody: {}}), {
                state: this.playerState,
                inventory: {manager: await this.createInventory(7, {axe: 1}), client: {extractItemsDataForSend: () => ({})}}
            })
        };
        seller.client = {sessionId: 'session-7', send: (messageKey, message) => seller.sentMessages.push(message)};
        return seller;
    }

    async sendSellMessage(trader, seller, message)
    {
        await trader.executeMessageActions(
            seller.client,
            Object.assign({act: ObjectsConst.OBJECT_INTERACTION, id: this.traderId, value: 'sell'}, message),
            {},
            seller.playerSchema
        );
        return seller.sentMessages[seller.sentMessages.length - 1].result;
    }

    async addSellerAxe(trader, seller)
    {
        await this.sendSellMessage(trader, seller, {});
        return await this.sendSellMessage(trader, seller, {
            [ObjectsConst.TRADE_ACTIONS.SUB_ACTION]: ObjectsConst.TRADE_ACTIONS.ADD,
            itemId: 'axe',
            itemKey: 'axe',
            qty: 1
        });
    }

    async testTraderWithoutItemsStartsNoTransaction()
    {
        await this.test('a trader without assigned items creates no inventory and starts no transaction', async () => {
            let loadedOwners = [];
            let repository = this.createEmptyInventoryRepository(loadedOwners);
            let trader = this.createTrader();
            await trader.runAdditionalSetup({objectsManager: {dataServer: {getEntity: () => repository}}});
            let sentMessages = [];
            let client = {sessionId: 'session-7', send: (messageKey, message) => sentMessages.push(message)};
            let playerSchema = Object.assign(
                GameplayPlayerBuilder.createPlayerSchema({physicalBody: {}}),
                {state: this.playerState, inventory: {manager: {}}}
            );
            let result = await trader.executeMessageActions(
                client,
                {act: ObjectsConst.OBJECT_INTERACTION, id: this.traderId, value: ObjectsConst.DEFAULTS.TRADER_OBJECT.OPTIONS.BUY},
                {},
                playerSchema
            );
            this.assert.deepStrictEqual(loadedOwners, [this.traderId]);
            this.assert.strictEqual(trader.inventory, false);
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(trader.tradesInProgress[playerSchema.player_id], false);
            this.assert.deepStrictEqual(sentMessages.map(message => message.act), [GameConst.UI]);
            this.assert.strictEqual(Boolean(sentMessages[0].listener), false);
        });
    }

    async testRequiredRewardMissingOnTraderRefusesTheSale()
    {
        await this.test('a sold item with a required reward the trader does not own is refused with its error', async () => {
            let trader = await this.createRequiredRewardTrader({axe: 1});
            let seller = await this.createSeller();
            let added = await this.addSellerAxe(trader, seller);
            this.assert.deepStrictEqual(
                [added.subAction, added.subActionResult, added.lastErrorMessage, added.exchangeData.B],
                [ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.ADD, false, ItemsConst.ERROR_CODES.REWARD.ITEM_NOT_PRESENT, {}]
            );
            this.assert.strictEqual(seller.playerSchema.inventory.manager.findItemByKey('axe').qty, 1);
            this.assert.strictEqual(seller.playerSchema.inventory.manager.findItemByKey('coins'), false);
        });
    }

    async testLeavingPlayerTradeIsCancelledAndRemoved()
    {
        await this.test('the trade of a leaving player is cancelled, unlocking its inventory, and removed', async () => {
            let trader = await this.createRequiredRewardTrader({axe: 1});
            let seller = await this.createSeller();
            await this.sendSellMessage(trader, seller, {});
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            let sellerInventory = seller.playerSchema.inventory.manager;
            let playerId = seller.playerSchema.player_id;
            let lockedWhileTrading = sellerInventory.locked;
            let cancelledWithoutObjects = objectsManager.cancelPlayerTrades(playerId, false);
            objectsManager.roomObjects = {[this.traderId]: trader};
            this.assert.deepStrictEqual(
                [
                    lockedWhileTrading,
                    cancelledWithoutObjects,
                    objectsManager.cancelPlayerTrades(playerId, false),
                    sellerInventory.locked,
                    sc.hasOwn(trader.tradesInProgress, playerId),
                    trader.cancelPlayerTrade(playerId)
                ],
                [true, false, true, false, false, false]
            );
        });
    }

    async testACancelledTradeClosesTheTraderUiOfItsClient()
    {
        await this.test('a cancelled trade closes the trader UI of the given client, a player without trade gets nothing', async () => {
            let trader = await this.createRequiredRewardTrader({axe: 1});
            let seller = await this.createSeller();
            await this.sendSellMessage(trader, seller, {});
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            objectsManager.roomObjects = {[this.traderId]: trader};
            let sentMessages = [];
            let client = {send: (type, message) => sentMessages.push(message)};
            let playerId = seller.playerSchema.player_id;
            let results = [
                objectsManager.cancelPlayerTrades(playerId, client),
                objectsManager.cancelPlayerTrades(playerId, client)
            ];
            this.assert.deepStrictEqual(
                [results, sentMessages],
                [[true, true], [{act: GameConst.CLOSE_UI_ACTION, id: trader.id}]]
            );
        });
    }

}

module.exports.TestTraderObject = TestTraderObject;
