/**
 *
 * Reldens - Processor
 *
 * Processes exchange transactions between inventories.
 * Provides static methods for add, remove, and confirm operations: the NPC trades confirm both inventories and the
 * trades between players confirm or disconfirm the inventory of the player that sent the action. An equipped item is
 * never pushed for exchange, whatever the client sends. A player keeps one exchange at a time: a player whose inventory
 * is locked is in an exchange (a trader shop or a player trade), with server/players/exchanges/newCancelsActive
 * disabled its new exchange is refused, with it enabled the new exchange starts and the exchanges in progress of the
 * locked players are cancelled through the "reldens.cancelPlayerExchanges" event (the inventory plugin closes the
 * player trade, the objects plugin cancels the trader shops).
 *
 */

const { ExchangePlatform } = require('@reldens/items-system');
const { Logger, sc } = require('@reldens/utils');

class Processor
{

    /**
     * @param {Object} props
     * @returns {Promise<Object|boolean>}
     */
    static async init(props)
    {
        let data = sc.get(props, 'data', false);
        let from = sc.get(props, 'from', false);
        let to = sc.get(props, 'to', false);
        if(false === data || false === from || false === to){
            return false;
        }
        let exchangePlatform = new ExchangePlatform();
        let exchangeParams = {
            inventoryA: from,
            inventoryB: to,
            exchangeRequirementsA: sc.get(props, 'exchangeRequirementsA', []),
            exchangeRewardsB: sc.get(props, 'exchangeRewardsB', []),
            dropExchangeA: sc.get(props, 'dropExchangeA', false),
            dropExchangeB: sc.get(props, 'dropExchangeB', false),
            avoidExchangeDecreaseA: sc.get(props, 'avoidExchangeDecreaseA', false),
            avoidExchangeDecreaseB: sc.get(props, 'avoidExchangeDecreaseB', false)
        };
        exchangePlatform.initializeExchangeBetween(exchangeParams);
        return exchangePlatform;
    }

    /**
     * @param {Array<Object>} playersSchemas
     * @param {boolean} newExchangeCancelsActive
     * @returns {boolean}
     */
    static isNewExchangeRefused(playersSchemas, newExchangeCancelsActive)
    {
        if(newExchangeCancelsActive || 0 === this.fetchPlayersInExchange(playersSchemas).length){
            return false;
        }
        Logger.info('New exchange refused, a player is already in an exchange.');
        return true;
    }

    /**
     * @param {Object} room
     * @param {Array<Object>} playersSchemas
     * @param {boolean} newExchangeCancelsActive
     * @returns {Promise<boolean>}
     */
    static async cancelActiveExchanges(room, playersSchemas, newExchangeCancelsActive)
    {
        if(!newExchangeCancelsActive){
            return false;
        }
        for(let playerSchema of this.fetchPlayersInExchange(playersSchemas)){
            await room.events.emit('reldens.cancelPlayerExchanges', {room, playerSchema});
        }
        return true;
    }

    /**
     * @param {Array<Object>} playersSchemas
     * @returns {Array<Object>}
     */
    static fetchPlayersInExchange(playersSchemas)
    {
        let playersInExchange = [];
        for(let playerSchema of playersSchemas){
            if(playerSchema?.inventory?.manager?.locked){
                playersInExchange.push(playerSchema);
            }
        }
        return playersInExchange;
    }

    /**
     * @param {Object} props
     * @returns {Object|boolean}
     */
    static fetchTransactionProps(props)
    {
        let transactionProps = {
            data: sc.get(props, 'data', false),
            transaction: sc.get(props, 'transaction', false),
            inventoryKey: sc.get(props, 'inventoryKey', false)
        };
        if(
            false === transactionProps.data
            || false === transactionProps.transaction
            || false === transactionProps.inventoryKey
        ){
            Logger.critical({'Missing data': transactionProps});
            return false;
        }
        return transactionProps;
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async add(props)
    {
        let transactionProps = Processor.fetchTransactionProps(props);
        if(!transactionProps){
            return false;
        }
        let pushedItem = sc.get(
            transactionProps.transaction.inventories[transactionProps.inventoryKey]?.items,
            transactionProps.data.itemId,
            false
        );
        if(pushedItem?.equipped){
            Logger.info('Equipped items can not be exchanged.', transactionProps.data.itemId);
            return false;
        }
        return await transactionProps.transaction.pushForExchange(
            transactionProps.data.itemId,
            transactionProps.data.qty,
            transactionProps.inventoryKey
        );
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async remove(props)
    {
        let transactionProps = Processor.fetchTransactionProps(props);
        if(!transactionProps){
            return false;
        }
        return await transactionProps.transaction.removeFromExchange(
            transactionProps.data.itemId,
            transactionProps.inventoryKey
        );
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async confirm(props)
    {
        let transactionProps = Processor.fetchTransactionProps(props);
        if(!transactionProps){
            return false;
        }
        await transactionProps.transaction.confirmExchange('A');
        await transactionProps.transaction.confirmExchange('B');
        return await transactionProps.transaction.finalizeExchange();
    }

    /**
     * @param {Object} props
     * @param {boolean} isConfirmed
     * @returns {Promise<boolean>}
     */
    static async updatePlayerConfirmation(props, isConfirmed)
    {
        let transactionProps = Processor.fetchTransactionProps(props);
        if(!transactionProps){
            return false;
        }
        if(!isConfirmed){
            return await transactionProps.transaction.disconfirmExchange(transactionProps.inventoryKey);
        }
        await transactionProps.transaction.confirmExchange(transactionProps.inventoryKey);
        return await transactionProps.transaction.finalizeExchange();
    }

}

module.exports.Processor = Processor;
