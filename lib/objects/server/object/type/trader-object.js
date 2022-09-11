/**
 *
 * Reldens - TraderObject
 *
 */

const { NpcObject } = require('./npc-object');
const { ObjectsConst } = require('../../../constants');
const { BuyProcessor } = require('../../../../inventory/server/exchange/buy-processor');
const { SellProcessor } = require('../../../../inventory/server/exchange/sell-processor');
const { TradeProcessor } = require('../../../../inventory/server/exchange/trade-processor');
const { ItemsManager, ItemsFactory, ItemsEvents } = require('@reldens/items-system');
const { Logger, sc } = require('@reldens/utils');

class TraderObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        // hardcoded properties for this specific object type:
        this.type = ObjectsConst.TYPE_TRADER;
        this.clientParams.type = ObjectsConst.TYPE_TRADER;
        this.clientParams.ui = true;
        this.content = sc.get(this.clientParams, 'content', ObjectsConst.DEFAULTS.TRADER_OBJECT.CONTENT);
        this.options = sc.get(this.clientParams, 'options', ObjectsConst.DEFAULTS.TRADER_OBJECT.OPTIONS);
        this.sendInvalidOptionMessage = true;
        this.inventory = {};
        this.tradesInProgress = {};
    }

    async runAdditionalSetup(props)
    {
        let dataServer = sc.get(props.objectsManager, 'dataServer', false);
        if(false === dataServer){
            Logger.error('Data Server was not specified.');
            return;
        }
        let objectsInventoryRepository = dataServer.getEntity('objectsInventory');
        let itemsModelsList = await objectsInventoryRepository.loadByWithRelations(
            'owner_id',
            this.id,
            ['items_item.items_modifiers']
        );
        this.inventory = new ItemsManager({
            owner: this,
            eventsManager: this.events,
            itemClasses: this.config.get('server/customClasses/inventory/items', true) || {},
            groupClasses: this.config.get('server/customClasses/inventory/groups', true) || {},
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
        let optionIdx = data.value;
        if(!this.isValidOption(data) || !this.isValidIndexValue(optionIdx, room, client)){
            return false;
        }
        let mappedProcessor = this.mapProcessor(optionIdx);
        if(false === mappedProcessor){
            return false;
        }
        let mappedSubAction = this.mapSubAction(sc.get(data, ObjectsConst.TRADE_ACTIONS.SUB_ACTION, false));
        if(false !== mappedSubAction && sc.isFunction(mappedProcessor, mappedSubAction)){
            this.tradesInProgress[playerSchema.playerId] = await mappedProcessor[mappedSubAction]({
                transaction: this.tradesInProgress[playerSchema.playerId],
                data
            });
            if(false === this.tradesInProgress[playerSchema.playerId]){
                return this.transactionError(playerSchema, 'Transaction error.');
            }
            return this.tradesInProgress[playerSchema.playerId];
        }
        this.tradesInProgress[playerSchema.playerId] = await mappedProcessor.init({
            data,
            from: this,
            to: playerSchema
        });
        if(false === this.tradesInProgress[playerSchema.playerId]){
            return this.transactionError(playerSchema, 'Transaction could not be initialized.');
        }
        return this.tradesInProgress[playerSchema.playerId];
    }

    transactionError(playerSchema, message)
    {
        Logger.error(message, {'Player ID': playerSchema.playerId});
        delete this.tradesInProgress[playerSchema.playerId];
        return false;
    }

    mapProcessor(action)
    {
        let map = {
            buy: BuyProcessor,
            sell: SellProcessor,
            trade: TradeProcessor
        }
        return sc.get(map, action, false);
    }

    mapSubAction(subAction)
    {
        if(false === subAction || '' === subAction){
            return false;
        }
        let map = {
            tba: 'buyAdd',
            tbr: 'buyRemove',
            tbc: 'buyConfirm',
            tsa: 'sellAdd',
            tsr: 'sellRemove',
            tsc: 'sellConfirm',
            tta: 'tradeAdd',
            ttr: 'tradeRemove',
            ttc: 'tradeConfirm'
        };
        return sc.get(map, subAction, false);
    }

}

module.exports.TraderObject = TraderObject;
