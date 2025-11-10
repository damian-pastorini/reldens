/**
 *
 * Reldens - TraderObject
 *
 */

const { NpcObject } = require('./npc-object');
const { ObjectsConst } = require('../../../constants');
const { Processor } = require('../../../../inventory/server/exchange/processor');
const { GameConst } = require('../../../../game/constants');
const {
    ItemsManager,
    ItemsFactory,
    ItemsEvents,
    RequirementsCollection,
    RewardsCollection, ItemsConst
} = require('@reldens/items-system');
const { Logger, sc } = require('@reldens/utils');

class TraderObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.type = ObjectsConst.TYPE_TRADER;
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.TRADER;
        this.clientParams.type = ObjectsConst.TYPE_TRADER;
        this.sendInvalidOptionMessage = true;
        this.inventory = false;
        this.exchangeRequirementsA = new RequirementsCollection();
        this.exchangeRewardsB = new RewardsCollection();
        this.tradesInProgress = {};
        this.configuredItemClasses = this.config.getWithoutLogs('server/customClasses/inventory/items', {});
        this.configuredGroupClasses = this.config.getWithoutLogs('server/customClasses/inventory/groups', {});
        this.dataServer = false;
        this.content = sc.get(this.clientParams, 'content', ObjectsConst.SNIPPETS.TRADER.CONTENT);
        this.options = sc.get(this.clientParams, 'options', {
            buy: {
                label: ObjectsConst.SNIPPETS.TRADER.OPTIONS.BUY,
                value: ObjectsConst.DEFAULTS.TRADER_OBJECT.OPTIONS.BUY
            },
            sell: {
                label: ObjectsConst.SNIPPETS.TRADER.OPTIONS.SELL,
                value: ObjectsConst.DEFAULTS.TRADER_OBJECT.OPTIONS.SELL
            }
        });
    }

    async runAdditionalSetup(props)
    {
        this.dataServer = sc.get(props.objectsManager, 'dataServer', false);
        if(false === this.dataServer){
            Logger.error('Data Server was not specified.');
            return;
        }
        await this.createObjectInventory();
    }

    async createObjectInventory()
    {
        let objectsInventoryRepository = this.dataServer.getEntity('objectsItemsInventory');
        let itemsModelsList = await objectsInventoryRepository.loadByWithRelations(
            'owner_id',
            this.id,
            ['related_items_item.related_items_item_modifiers']
        );
        if(0 === itemsModelsList.length){
            Logger.error('Object does not have any items assigned.');
            return;
        }
        await this.enrichWithLoadedRequirements();
        await this.enrichWithLoadedRewards();
        // @NOTE: here we create an ItemsManager and not an ItemsServer because the object is not connected to any
        // specific client, so we need to send the object items "manually" to the current client on each message.
        this.inventory = new ItemsManager({
            owner: this,
            eventsManager: this.events,
            itemClasses: this.configuredItemClasses,
            groupClasses: this.configuredGroupClasses,
            itemsModelData: this.config.inventory.items
        });
        let itemsInstances = await ItemsFactory.fromModelsList(itemsModelsList, this.inventory);
        if(false === itemsInstances){
            Logger.error('Item instances could not be created.');
            return;
        }
        await this.inventory.fireEvent(ItemsEvents.LOADED_OWNER_ITEMS, this, itemsInstances, itemsModelsList);
        await this.inventory.setItems(itemsInstances);
    }

    async enrichWithLoadedRequirements()
    {
        let objectsItemsRequirementsRepository = this.dataServer.getEntity('objectsItemsRequirements');
        let exchangeRequirementsModelsList = await objectsItemsRequirementsRepository.loadBy('object_id', this.id);
        if(0 === exchangeRequirementsModelsList.length){
            return;
        }
        for(let exchangeRequirement of exchangeRequirementsModelsList){
            this.exchangeRequirementsA.add(
                // @Note: uid is used for the requirement key but for our "buy" process we don't need different items
                // with the same key for different requirements.
                exchangeRequirement.item_key,
                exchangeRequirement.item_key,
                exchangeRequirement.required_item_key,
                exchangeRequirement.required_quantity,
                exchangeRequirement.auto_remove_requirement
            );
        }
    }

    async enrichWithLoadedRewards()
    {
        let objectsItemsRewardsRepository = this.dataServer.getEntity('objectsItemsRewards');
        let exchangeRewardsModelsList = await objectsItemsRewardsRepository.loadBy('object_id', this.id);
        if(0 === exchangeRewardsModelsList.length){
            return;
        }
        for(let exchangeReward of exchangeRewardsModelsList){
            this.exchangeRewardsB.add(
                // @Note: uid is used for the reward key but for our "sell" process we don't need different items with
                // the same key for different rewards.
                exchangeReward.item_key,
                exchangeReward.item_key,
                exchangeReward.reward_item_key,
                exchangeReward.reward_quantity,
                exchangeReward.reward_item_is_required
            );
        }
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        let tradeKey = playerSchema.player_id;
        if(this.shouldCancelExchange(data, tradeKey)){
            this.tradesInProgress[tradeKey].cancelExchange();
            return false;
        }
        let superResult = await super.executeMessageActions(client, data, room, playerSchema);
        if(false === superResult){
            return false;
        }
        let tradeAction = sc.get(data, 'value', 'init');
        let inventoryKey = this.mapInventoryKeyFromAction(tradeAction);
        if(false === inventoryKey){
            if('init' !== tradeAction){
                Logger.error('Undefined inventory key for action: "'+tradeAction+'".');
            }
            return false;
        }
        let subActionParam = sc.get(data, ObjectsConst.TRADE_ACTIONS.SUB_ACTION, false);
        let mappedSubAction = this.mapSubAction(subActionParam);
        if(false !== mappedSubAction && sc.isFunction(Processor[mappedSubAction])){
            return await this.processSubAction(mappedSubAction, tradeKey, data, playerSchema, inventoryKey, tradeAction, client);
        }
        return await this.initializeTransaction(tradeKey, data, playerSchema, inventoryKey, tradeAction, client);
    }

    async initializeTransaction(tradeKey, data, playerSchema, inventoryKey, tradeAction, client)
    {
        let exchangeRequirementsA = sc.get(this, 'exchangeRequirementsA', new RequirementsCollection());
        let exchangeRewardsB = sc.get(this, 'exchangeRewardsB', new RewardsCollection());
        // @TODO - BETA - Transaction initialization and requirements could be sent only once to each client.
        let params = {
            data,
            from: this.inventory,
            to: playerSchema.inventory.manager,
            exchangeRequirementsA,
            exchangeRewardsB
        };
        params['dropExchangeA'] = true;
        if(ItemsConst.TRADE_ACTIONS.BUY === tradeAction){
            params['avoidExchangeDecreaseA'] = true;
        }
        this.tradesInProgress[tradeKey] = await Processor.init(params);
        if(false === this.tradesInProgress[tradeKey]){
            return this.transactionError(playerSchema, 'Transaction could not be initialized.');
        }
        // on "sell" we will send the items of the player, on "buy" we will send this object items:
        let inventory = this.tradesInProgress[tradeKey].inventories[inventoryKey];
        let inventoryItems = inventory.items;
        // @TODO - BETA - Refactor when include false conditions in the shortcuts.
        if(ItemsConst.TRADE_ACTIONS.SELL === tradeAction){
            inventoryItems = [
                ...(inventory.findItemsByPropertyValue('equipped', false) || []),
                ...(inventory.findItemsByPropertyValue('equipped', undefined) || [])];
        }
        let sendData = {
            act: GameConst.UI,
            id: this.id,
            result: {
                action: tradeAction,
                items: playerSchema.inventory.client.extractItemsDataForSend(inventoryItems),
                exchangeRequirementsA: exchangeRequirementsA.requirements,
                exchangeRewardsB: exchangeRewardsB.rewards
            },
            listener: 'traderObject'
        };
        client.send('*', sendData);
        return true;
    }

    async processSubAction(mappedSubAction, tradeKey, data, playerSchema, inventoryKey, tradeAction, client)
    {
        if(false === sc.get(this.tradesInProgress, tradeKey, false)){
            let result = await this.initializeTransaction(
                tradeKey,
                data,
                playerSchema,
                inventoryKey,
                tradeAction,
                client
            );
            if(false === result){
                Logger.error(
                    'Transaction could not be initialized on sub-action process.',
                    data,
                    tradeKey,
                    tradeAction
                );
                return false;
            }
        }
        let subActionResult = await Processor[mappedSubAction]({
            transaction: this.tradesInProgress[tradeKey],
            data,
            inventoryKey
        });
        let inventory = this.tradesInProgress[tradeKey].inventories[inventoryKey];
        let inventoryItems = inventory.items;
        // @TODO - BETA - Refactor when include false conditions in the shortcuts and a new property "canBeTraded".
        if(ItemsConst.TRADE_ACTIONS.SELL === tradeAction){
            inventoryItems = [
                ...(inventory.findItemsByPropertyValue('equipped', false) || []),
                ...(inventory.findItemsByPropertyValue('equipped', undefined) || [])
            ];
        }
        let sendData = {
            act: GameConst.UI,
            id: this.id,
            result: {
                action: tradeAction,
                subAction: mappedSubAction,
                subActionResult: Boolean(subActionResult),
                lastErrorMessage: this.tradesInProgress[tradeKey].lastError.code,
                lastErrorData: this.tradesInProgress[tradeKey].lastError.data,
                exchangeData: this.tradesInProgress[tradeKey].exchangeBetween,
                items: playerSchema.inventory.client.extractItemsDataForSend(inventoryItems),
                exchangeRequirementsA: this.exchangeRequirementsA?.requirements || [],
                exchangeRewardsB: this.exchangeRewardsB?.rewards || []
            },
            listener: 'traderObject'
        };
        client.send('*', sendData);
        if(true === subActionResult && ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.CONFIRM === mappedSubAction){
            delete this.tradesInProgress[tradeKey];
        }
        return true;
    }

    shouldCancelExchange(data, tradeKey)
    {
        return GameConst.CLOSE_UI_ACTION === data.act
            && this.id === data.id
            && this.tradesInProgress[tradeKey];
    }

    transactionError(playerSchema, message)
    {
        Logger.error(message, {
            'Player ID': sc.get(playerSchema, 'player_id', 'Undefined'),
            'Trade in progress': sc.get(this.tradesInProgress, playerSchema.player_id, 'None')
        });
        return false;
    }

    mapInventoryKeyFromAction(action)
    {
        return sc.get(ObjectsConst.DEFAULTS.TRADER_OBJECT.INVENTORY_MAP, action, false);
    }

    mapSubAction(subAction)
    {
        if(false === subAction || '' === subAction){
            return false;
        }
        let map = {
            [ObjectsConst.TRADE_ACTIONS.ADD]: ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.ADD,
            [ObjectsConst.TRADE_ACTIONS.REMOVE]: ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.REMOVE,
            [ObjectsConst.TRADE_ACTIONS.CONFIRM]: ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.CONFIRM
        }
        return sc.get(map, subAction, false);
    }

}

module.exports.TraderObject = TraderObject;
