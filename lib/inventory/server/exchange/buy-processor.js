/**
 *
 * Reldens - BuyProcessor
 *
 */

const { ExchangePlatform } = require('@reldens/items-system');
const { sc } = require('@reldens/utils');

class BuyProcessor
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
        exchangePlatform.initializeExchangeBetween({
            inventoryA: from.inventory,
            inventoryB: to.inventory
        })
        return exchangePlatform;
    }

    static async buyAdd(props)
    {
        let data = sc.get(props, 'data', false);
        let transaction = sc.get(props, 'transaction', false);
        if(false === data || false === transaction){
            return false;
        }
        return transaction;
    }

    static async buyRemove(props)
    {

    }

    static async buyConfirm(props)
    {

    }

}

module.exports.BuyProcessor = BuyProcessor;
