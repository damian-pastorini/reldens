/**
 *
 * Reldens - ExchangeUpdateSender
 *
 * Sends the trade box update of a players trade to one of its two players: the not equipped items of the owner, the
 * items the other player offers (read from the inventory of its exchange side), both confirmations and the trade end.
 *
 */

const { InventoryConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@colyseus/core').Client} Client
 */
class ExchangeUpdateSender
{

    /**
     * @param {Object} playerOwner
     * @param {Object} playerTo
     * @param {Client} playerToClient
     * @returns {boolean}
     */
    static send(playerOwner, playerTo, playerToClient)
    {
        let ownerItems = playerOwner.inventory.manager.items;
        let fromInventoryItems = Object.keys(ownerItems).map(itemId => ownerItems[itemId]).filter(
            item => true !== item.equipped
        );
        let tradeInProgress = playerOwner.tradeInProgress;
        if(!tradeInProgress){
            Logger.critical('Trade not longer in progress.');
            return false;
        }
        let ownerSessionId = tradeInProgress.inventories['A']?.owner?.sessionId;
        if(!ownerSessionId){
            Logger.critical('Trade owner unavailable.');
            return false;
        }
        let playerToExchangeKey = ownerSessionId === playerTo.sessionId ? 'A' : 'B';
        let traderItemsData = ExchangeUpdateSender.extractExchangeItemsDataFromInventory(
            playerToExchangeKey,
            tradeInProgress
        );
        let playerConfirmed = tradeInProgress.confirmations[playerToExchangeKey];
        let myExchangeKey = 'A' === playerToExchangeKey ? 'B' : 'A';
        let sendData = {
            act: InventoryConst.ACTIONS.TRADE_SHOW, listener: 'trade',
            with: playerTo.playerName,
            id: playerTo.sessionId,
            playerConfirmed: playerConfirmed,
            myConfirmed: tradeInProgress.confirmations[myExchangeKey],
            isTradeEnd: (tradeInProgress.confirmations['A'] && tradeInProgress.confirmations['B']),
            playerToExchangeKey,
            exchangeData: tradeInProgress.exchangeBetween,
            items: playerOwner.inventory.client.extractItemsDataForSend(fromInventoryItems),
            traderItemsData
        };
        playerToClient.send('*', sendData);
        return true;
    }

    /**
     * @param {string} playerToExchangeKey
     * @param {Object} tradeInProgress
     * @returns {Object<string, Object>}
     */
    static extractExchangeItemsDataFromInventory(playerToExchangeKey, tradeInProgress)
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

}

module.exports.ExchangeUpdateSender = ExchangeUpdateSender;
