/**
 *
 * Reldens - BuyProcessor
 *
 */

const { ExchangePlatform } = require('@reldens/items-system');
const { Logger, sc } = require('@reldens/utils');

class Processor
{

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
            dropExchangeA: true,
            avoidExchangeDecreaseA: true
        };
        exchangePlatform.initializeExchangeBetween(exchangeParams);
        return exchangePlatform;
    }

    static async add(props)
    {
        let data = sc.get(props, 'data', false);
        let transaction = sc.get(props, 'transaction', false);
        let inventoryKey = sc.get(props, 'inventoryKey', false);
        if(false === data || false === transaction || false === inventoryKey){
            Logger.critical({'Missing data': {data, transaction, inventoryKey}});
            return false;
        }
        return await transaction.pushForExchange(data.itemId, data.qty, inventoryKey);
    }

    static async remove(props)
    {
        let data = sc.get(props, 'data', false);
        let transaction = sc.get(props, 'transaction', false);
        let inventoryKey = sc.get(props, 'inventoryKey', false);
        if(false === data || false === transaction || false === inventoryKey){
            Logger.critical({'Missing data': {data, transaction, inventoryKey}});
            return false;
        }
        return await transaction.removeFromExchange(data.itemId, inventoryKey);
    }

    static async confirm(props)
    {
        let data = sc.get(props, 'data', false);
        let transaction = sc.get(props, 'transaction', false);
        let inventoryKey = sc.get(props, 'inventoryKey', false);
        if(false === data || false === transaction || false === inventoryKey){
            Logger.critical({'Missing data': {data, transaction, inventoryKey}});
            return false;
        }
        await transaction.confirmExchange('A');
        await transaction.confirmExchange('B');
        return await transaction.finalizeExchange();
    }

}

module.exports.Processor = Processor;
