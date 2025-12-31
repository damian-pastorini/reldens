/**
 *
 * Reldens - PlayerProcessor
 *
 * Processes player-to-player exchange transactions.
 * Extends Processor with player-specific confirm/disconfirm operations.
 *
 */

const { Processor } = require('./processor');
const { Logger, sc } = require('@reldens/utils');

class PlayerProcessor extends Processor
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async confirm(props)
    {
        let data = sc.get(props, 'data', false);
        let transaction = sc.get(props, 'transaction', false);
        let inventoryKey = sc.get(props, 'inventoryKey', false);
        if(false === data || false === transaction || false === inventoryKey){
            Logger.critical({'Missing data': {data, transaction, inventoryKey}});
            return false;
        }
        await transaction.confirmExchange(inventoryKey);
        return await transaction.finalizeExchange();
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async disconfirm(props)
    {
        let data = sc.get(props, 'data', false);
        let transaction = sc.get(props, 'transaction', false);
        let inventoryKey = sc.get(props, 'inventoryKey', false);
        if(false === data || false === transaction || false === inventoryKey){
            Logger.critical({'Missing data': {data, transaction, inventoryKey}});
            return false;
        }
        return await transaction.disconfirmExchange(inventoryKey);
    }

}

module.exports.PlayerProcessor = PlayerProcessor;
