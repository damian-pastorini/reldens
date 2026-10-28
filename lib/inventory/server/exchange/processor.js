/**
 *
 * Reldens - Processor
 *
 * Processes exchange transactions between inventories.
 * Provides static methods for add, remove, and confirm operations: the NPC trades confirm both inventories and the
 * trades between players confirm or disconfirm the inventory of the player that sent the action.
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
        // @possible-hallucinated-undefined-method
        await transactionProps.transaction.confirmExchange(transactionProps.inventoryKey);
        return await transactionProps.transaction.finalizeExchange();
    }

}

module.exports.Processor = Processor;
