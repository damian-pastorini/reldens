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

class InventoryMessageActions
{
    constructor()
    {
        // @TODO - BETA - Make all these values configurable.
        this.tradeAcceptDeclineOptions = {'1':{'label':'Accept','value':1},'2':{'label':'Decline','value':2}};
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(!sc.hasOwn(data, 'act')){
            return false;
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

    tryExchangeStart(client, data, room, playerSchema)
    {
        if(client.sessionId === data.id){
            Logger.info('The player is trying to trade with himself.', client.sessionId, data);
            return false;
        }
        if(playerSchema.tradeInProgress){
            playerSchema.tradeInProgress.cancelExchange();
        }
        playerSchema.tradeInProgress = new ExchangePlatform({events: room.events});
        let toPlayerClient = sc.get(room.activePlayers, data.id, false);
        if(false === toPlayerClient){
            Logger.error('Player client not found.', toPlayerClient, data);
            return false;
        }
        let sendData = {
            act: InventoryConst.ACTIONS.TRADE_START,
            listener: 'trade',
            from: playerSchema.playerName,
            id: playerSchema.player_id,
        };
        let awaitTrade = room.config.get('client/trade/players/awaitTimeOut', true);
        if(awaitTrade){
            setTimeout(() => {
                if(playerSchema.tradeInProgress?.inventories?.A && playerSchema.tradeInProgress?.inventories?.B){
                    return true;
                }
                playerSchema.tradeInProgress?.cancelExchange();
                return false;
            }, room.config.get('client/trade/players/timeOut', 5000))
        }
        toPlayerClient.client.send('*', sendData);
    }

    startExchange(client, data, room, playerSchema)
    {
        let exchangeStarterActivePlayer = room.fetchActivePlayerById(data.id);
        if(false === exchangeStarterActivePlayer){
            Logger.error('Missing player for exchange. Data ID: '+ data.id);
            return false;
        }
        let exchangeStarterPlayer = room.state.players[exchangeStarterActivePlayer.sessionId];
        exchangeStarterPlayer.tradeInProgress.initializeExchangeBetween({
            inventoryA: exchangeStarterPlayer.inventory.manager,
            inventoryB: playerSchema.inventory.manager
        });
        let toPlayerClient = sc.get(room.activePlayers, exchangeStarterPlayer.sessionId, false);
        if(false === toPlayerClient){
            Logger.error('Player client not found.', toPlayerClient, data);
            return false;
        }
        let sendData = {act: InventoryConst.ACTIONS.TRADE_SHOW, listener: 'trade'};
        let sendDataFrom = Object.assign(
            {with: playerSchema.playerName, id: playerSchema.player_id},
            sendData
        );
        let sendDataTo = Object.assign(
            {with: exchangeStarterPlayer.playerName, id: exchangeStarterPlayer.player_id},
            sendData
        );
        toPlayerClient.client.send('*', sendDataFrom);
        client.send('*', sendDataTo);
        console.log(sendDataFrom, sendDataTo, data);
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
