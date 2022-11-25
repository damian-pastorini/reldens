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
            from: playerSchema.playerName,
            id: playerSchema.player_id,
            listener: 'trade'
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
