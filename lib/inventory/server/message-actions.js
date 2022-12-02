/**
 *
 * Reldens - MessageActions
 *
 * Server side messages actions.
 *
 */

const { InventoryConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');
const { ExchangePlatform } = require('@reldens/items-system');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');
const { PlayerProcessor } = require('./exchange/player-processor');

class InventoryMessageActions
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(!sc.hasOwn(data, 'act')){
            return false;
        }
        if(GameConst.CLOSE_UI_ACTION === data.act){
            if(!sc.hasOwn(data, 'id')){
                return false;
            }
            if(0 !== data.id.indexOf('trade')){
                return false;
            }
            return this.closeTradeAction(client, data, room, playerSchema);
        }
        if(0 !== data.act.indexOf(InventoryConst.INVENTORY_PREF)){
            return false;
        }
        if(InventoryConst.ACTIONS.TRADE_START === data.act){
            this.tryExchangeStart(client, data, room, playerSchema);
            return true;
        }
        if(InventoryConst.ACTIONS.TRADE_ACCEPTED === data.act && '1' === data.value){
            this.startExchange(client, data, room, playerSchema);
            return true;
        }
        if(InventoryConst.ACTIONS.TRADE_ACTION === data.act){
            await this.runTradeAction(client, data, room, playerSchema);
            return true;
        }
        if(InventoryConst.ACTION_REMOVE === data.act){
            playerSchema.inventory.manager.removeItem(data.idx);
            return true;
        }
        if(InventoryConst.ACTION_USE === data.act){
            if(!sc.hasOwn(playerSchema.inventory.manager.items, data.idx)){
                Logger.info('Cannot use item, key not found: '+data.idx);
                return false;
            }
            playerSchema.inventory.manager.items[data.idx].use();
        }
        if(InventoryConst.ACTION_EQUIP === data.act){
            return await this.executeEquipAction(playerSchema, data);
        }
    }

    closeTradeAction(client, data, room, playerSchema)
    {
        let ownerA = playerSchema.tradeInProgress?.inventories['A']?.owner.sessionId;
        let ownerB = playerSchema.tradeInProgress?.inventories['B']?.owner.sessionId;
        let closeOnClientId = playerSchema.sessionId === ownerA ? ownerB : ownerA;
        if(closeOnClientId){
            let closeOnClient = sc.get(room.activePlayers, closeOnClientId, false);
            if(false !== closeOnClient){
                let sendData = {act: GameConst.CLOSE_UI_ACTION, id: 'trade'+playerSchema.sessionId};
                closeOnClient.client?.send('*', sendData);
            }
        }
        playerSchema.tradeInProgress?.cancelExchange();
        return true;
    }

    tryExchangeStart(client, data, room, playerSchema)
    {
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to trade with himself.', playerSchema.sessionId, data);
            return false;
        }
        if(playerSchema.tradeInProgress){
            playerSchema.tradeInProgress.cancelExchange();
        }
        playerSchema.tradeInProgress = new ExchangePlatform({
            events: room.events,
            exchangeInitializerId: playerSchema.sessionId
        });
        let toPlayerClient = sc.get(room.activePlayers, data.id, false);
        if(false === toPlayerClient){
            Logger.error('Player client not found.', toPlayerClient, data);
            return false;
        }
        let sendData = {
            act: InventoryConst.ACTIONS.TRADE_START,
            listener: 'trade',
            from: playerSchema.playerName,
            id: playerSchema.sessionId,
        };
        let awaitTrade = room.config.get('client/trade/players/awaitTimeOut', true);
        if(awaitTrade){
            setTimeout(() => {
                if(playerSchema.tradeInProgress?.inventories?.A && playerSchema.tradeInProgress?.inventories?.B){
                    return true;
                }
                playerSchema.tradeInProgress.cancelExchange();
                return false;
            }, room.config.get('client/trade/players/timeOut', 5000))
        }
        toPlayerClient.client.send('*', sendData);
    }

    isMyTrade(playerSchema)
    {
        return playerSchema.tradeInProgress.exchangeInitializerId === playerSchema.sessionId;
    }

    startExchange(client, data, room, playerSchema)
    {
        let exchangeStarterActivePlayer = sc.get(room.activePlayers, data.id, false);
        if(false === exchangeStarterActivePlayer){
            Logger.error('Missing player for exchange. Data ID: '+ data.id);
            return false;
        }
        let exchangeStarterPlayer = room.state.players[exchangeStarterActivePlayer.sessionId];
        if(!exchangeStarterPlayer){
            Logger.error(
                'Exchange error, the player is not in the room anymore. Data ID: '+ data.id,
                exchangeStarterPlayer
            );
            return false;
        }
        exchangeStarterPlayer.tradeInProgress.initializeExchangeBetween({
            inventoryA: exchangeStarterPlayer.inventory.manager,
            inventoryB: playerSchema.inventory.manager
        });
        // both players will use the same exchange platform instance, if one cancel the request the other will get it:
        playerSchema.tradeInProgress = exchangeStarterPlayer.tradeInProgress;
        // both players require the data:
        this.sendExchangeUpdate(exchangeStarterPlayer, playerSchema, exchangeStarterActivePlayer.client);
        this.sendExchangeUpdate(playerSchema, exchangeStarterPlayer, client);
    }

    async runTradeAction(client, data, room, playerSchema)
    {
        let subActionParam = sc.get(data, ObjectsConst.TRADE_ACTIONS.SUB_ACTION, false);
        let mappedSubAction = this.mapSubAction(subActionParam);
        if(false === mappedSubAction || !sc.isFunction(PlayerProcessor, mappedSubAction)){
            Logger.critical('Missing mapped sub-action.', mappedSubAction);
            return false;
        }
        let inventoryKey = this.isMyTrade(playerSchema) ? 'A' : 'B';
        let subActionResult = await PlayerProcessor[mappedSubAction]({
            transaction: playerSchema.tradeInProgress,
            data,
            inventoryKey
        });
        if(false === subActionResult && ObjectsConst.TRADE_ACTIONS.CONFIRM !== data.sub){
            Logger.error('Exchange sub-action error.', playerSchema.tradeInProgress.lastErrorMessage);
            return false;
        }
        let exchangeStarterActivePlayer = sc.get(room.activePlayers, data.id, false);
        if(false === exchangeStarterActivePlayer){
            Logger.error('Missing player for exchange. Data ID: '+ data.id);
            return false;
        }
        let exchangeStarterPlayer = room.state.players[exchangeStarterActivePlayer.sessionId];
        if(!exchangeStarterPlayer){
            Logger.error(
                'Exchange error, the player is not in the room anymore. Data ID: '+ data.id,
                exchangeStarterPlayer
            );
            return false;
        }
        this.sendExchangeUpdate(exchangeStarterPlayer, playerSchema, exchangeStarterActivePlayer.client);
        this.sendExchangeUpdate(playerSchema, exchangeStarterPlayer, client);
    }

    mapSubAction(subAction)
    {
        if(false === subAction || '' === subAction){
            return false;
        }
        let map = {};
        map[ObjectsConst.TRADE_ACTIONS.ADD] = ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.ADD;
        map[ObjectsConst.TRADE_ACTIONS.REMOVE] = ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.REMOVE;
        map[ObjectsConst.TRADE_ACTIONS.CONFIRM] = ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.CONFIRM;
        map[ObjectsConst.TRADE_ACTIONS.DISCONFIRM] = ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.DISCONFIRM;
        return sc.get(map, subAction, false);
    }

    sendExchangeUpdate(playerOwner, playerTo, playerToClient)
    {
        // @TODO - BETA - Refactor when include false conditions in the shortcuts and include a new property "tradable".
        let fromInventoryItems = [
            ...playerOwner.inventory.manager.findItemsByPropertyValue('equipped', false),
            ...playerOwner.inventory.manager.findItemsByPropertyValue('equipped', undefined)
        ];
        // the exchange key required for the items list is the opposite of the player inventory:
        let tradeInProgress = playerOwner.tradeInProgress;
        let playerToExchangeKey = tradeInProgress.inventories['A'].owner.sessionId === playerTo.sessionId
            ? 'A'
            : 'B';
        let traderItemsData = this.extractExchangeItemsDataFromInventory(
            playerToExchangeKey,
            tradeInProgress
        );
        let playerConfirmed = tradeInProgress.confirmations[playerToExchangeKey];
        let sendData = {
            act: InventoryConst.ACTIONS.TRADE_SHOW, listener: 'trade',
            with: playerTo.playerName,
            id: playerTo.sessionId,
            playerConfirmed: playerConfirmed,
            isTradeEnd: (tradeInProgress.confirmations['A'] && tradeInProgress.confirmations['B']),
            playerToExchangeKey,
            exchangeData: tradeInProgress.exchangeBetween,
            items: playerOwner.inventory.client.extractItemsDataForSend(fromInventoryItems),
            traderItemsData
        };
        playerToClient.send('*', sendData);
    }

    extractExchangeItemsDataFromInventory(playerToExchangeKey, tradeInProgress)
    {
        let exchangeItems = tradeInProgress.exchangeBetween[playerToExchangeKey];
        let exchangeItemsKeys = Object.keys(exchangeItems);
        if(0 === exchangeItemsKeys.length){
            return {};
        }
        let tradeItemsData = {};
        let inventoryItems = tradeInProgress.inventories[playerToExchangeKey].items;
        for(let i of exchangeItemsKeys){
            let itemData = inventoryItems[i];
            if(!itemData){
                Logger.error('Missing item data on inventory.', i, Object.keys(inventoryItems));
                continue;
            }
            tradeItemsData[i] = {
                key: itemData.key,
                label: itemData.label,
                qty: itemData.qty,
            };
        }
        return tradeItemsData;
    }

    async executeEquipAction(playerSchema, data)
    {
        // @TODO - BETA - This is temporal since for now we are only allowing one item per group. In the future
        //   we will use inventory groups properly on the server side to validate if the item can be equipped
        //   checking the group items limit (this also would help to avoid looping on all the items).
        let item = playerSchema.inventory.manager.items[data.idx];
        if(!item.equipped){
            this.unEquipPrevious(item.group_id, playerSchema.inventory.manager.items);
            await item.equip();
            return true;
        }
        await item.unequip();
        return true;
    }

    unEquipPrevious(groupId, itemsList)
    {
        for(let i of Object.keys(itemsList)){
            let item = itemsList[i];
            if(item.group_id === groupId && item.equipped){
                item.unequip();
                break;
            }
        }
    }

}

module.exports.InventoryMessageActions = InventoryMessageActions;
