/**
 *
 * Reldens - TraderObject
 *
 */

const { NpcObject } = require('./npc-object');
const { ObjectsConst } = require('../../../constants');
const { Processor } = require('../../../../inventory/server/exchange/processor');
const { ItemsManager, ItemsFactory, ItemsEvents } = require('@reldens/items-system');
const { GameConst } = require('../../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class TraderObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        // hardcoded properties for this specific object type:
        this.type = ObjectsConst.TYPE_TRADER;
        this.eventsPrefix = 'tnpc';
        this.clientParams.type = ObjectsConst.TYPE_TRADER;
        this.content = sc.get(this.clientParams, 'content', ObjectsConst.DEFAULTS.TRADER_OBJECT.CONTENT);
        this.options = sc.get(this.clientParams, 'options', ObjectsConst.DEFAULTS.TRADER_OBJECT.OPTIONS);
        this.sendInvalidOptionMessage = true;
        this.inventory = {};
        this.tradesInProgress = {};
        this.configuredItemClasses = this.config.get('server/customClasses/inventory/items', true) || {};
        this.configuredGroupClasses = this.config.get('server/customClasses/inventory/groups', true) || {};
    }

    async runAdditionalSetup(props)
    {
        let dataServer = sc.get(props.objectsManager, 'dataServer', false);
        if(false === dataServer){
            Logger.error('Data Server was not specified.');
            return;
        }
        await this.createObjectInventory(dataServer);
    }

    async createObjectInventory(dataServer)
    {
        let objectsInventoryRepository = dataServer.getEntity('objectsInventory');
        let itemsModelsList = await objectsInventoryRepository.loadByWithRelations(
            'owner_id',
            this.id,
            ['items_item.items_modifiers']
        );
        // @NOTE: here we create an ItemsManager and not an ItemsServer because the object is not connected to any
        // specific client, so we need to send the object items "manually" to the current client on each message.
        this.inventory = new ItemsManager({
            owner: this,
            eventsManager: this.events,
            itemClasses: this.configuredItemClasses,
            groupClasses: this.configuredGroupClasses,
            itemsModelData: this.config.inventory.items
        });
        if(!itemsModelsList.length){
            Logger.error('Object does not have any items assigned.');
            return;
        }
        let itemsInstances = await ItemsFactory.fromModelsList(itemsModelsList, this.inventory);
        if(false === itemsInstances){
            Logger.error('Item instances could not be created.');
            return;
        }
        await this.inventory.fireEvent(ItemsEvents.LOADED_OWNER_ITEMS, this, itemsInstances, itemsModelsList);
        await this.inventory.setItems(itemsInstances);
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        await super.executeMessageActions(client, data, room, playerSchema);
        let tradeAction = data.value;
        if(!this.isValidOption(data) || !this.isValidIndexValue(tradeAction, room, client)){
            return false;
        }
        let inventoryKey = this.mapInventoryKeyFromAction(tradeAction);
        if(false === inventoryKey){
            return false;
        }
        let mappedSubAction = this.mapSubAction(sc.get(data, ObjectsConst.TRADE_ACTIONS.SUB_ACTION, false));
        let tradeKey = playerSchema.playerId;
        if(false !== mappedSubAction && sc.isFunction(Processor, mappedSubAction)){
            this.tradesInProgress[tradeKey] = await Processor[mappedSubAction]({
                transaction: this.tradesInProgress[tradeKey],
                data,
                inventoryKey
            });
            if(false === this.tradesInProgress[tradeKey]){
                return this.transactionError(playerSchema, 'Transaction error.');
            }
            return this.tradesInProgress[tradeKey];
        }
        this.tradesInProgress[tradeKey] = await Processor.init({
            data,
            from: this.inventory,
            to: playerSchema.inventory.manager,
            exchangeRequirementsA: sc.get(this, 'exchangeRequirementsA', [])
        });
        if(false === this.tradesInProgress[tradeKey]){
            return this.transactionError(playerSchema, 'Transaction could not be initialized.');
        }
        // on "sell" we will send the items of the player, on "buy" we will send this object items:
        let inventoryItems = this.tradesInProgress[tradeKey].inventories[inventoryKey].items;
        let sendData = {
            act: GameConst.UI,
            id: this.id,
            result: {
                action: tradeAction || 'init',
                items: playerSchema.inventory.client.extractItemsDataForSend(inventoryItems)
            },
            listener: 'traderObject'
        };
        client.send('*', sendData);
        return true;
    }

    transactionError(playerSchema, message)
    {
        Logger.error(message, {'Player ID': playerSchema.playerId});
        delete this.tradesInProgress[playerSchema.playerId];
        return false;
    }

    mapInventoryKeyFromAction(action)
    {
        let map = {buy: 'A', sell: 'B'};
        return sc.get(map, action, false);
    }

    mapSubAction(subAction)
    {
        if(false === subAction || '' === subAction){
            return false;
        }
        let map = {ta: 'add', tr: 'remove', tc: 'confirm'};
        return sc.get(map, subAction, false);
    }

}

module.exports.TraderObject = TraderObject;
