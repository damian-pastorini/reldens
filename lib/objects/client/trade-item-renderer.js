/**
 *
 * Reldens - TradeItemRenderer
 *
 * Handles trade item HTML rendering for the trader object UI.
 *
 */

const { ItemsConst } = require('@reldens/items-system');
const { ObjectsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class TradeItemRenderer
{

    constructor(gameManager, uiScene, itemDisplayEnricher, message)
    {
        this.gameManager = gameManager;
        this.uiScene = uiScene;
        this.itemDisplayEnricher = itemDisplayEnricher;
        this.message = message;
    }

    fetchTemplate(templateKey)
    {
        let template = this.uiScene.cache.html.get(templateKey);
        if(!template){
            Logger.error('Missing template "'+templateKey+'".');
            return false;
        }
        return template;
    }

    fetchItemLabelByUid(itemUid)
    {
        return this.gameManager?.inventory?.manager?.items[itemUid]?.label
            || this.message?.result?.items[itemUid]?.label
            || '';
    }

    fetchExchangeEntriesByKey(itemKey, exchangeData)
    {
        if(0 === exchangeData.length){
            return false;
        }
        let result = {};
        for(let entry of exchangeData){
            if(itemKey !== entry.itemKey){
                continue;
            }
            result[entry.itemKey] = entry;
        }
        return result;
    }

    hasExchangeItems(exchangeItems, logContext)
    {
        if(0 < Object.keys(exchangeItems).length){
            return true;
        }
        if(!this.message.lastErrorMessage){
            Logger.info('Undefined exchange items on '+logContext+'.', {message: this.message});
        }
        return false;
    }

    loadTradeItemTemplate()
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        return this.fetchTemplate('inventoryTradeItem');
    }

    /**
     * @param {Object} item
     * @param {number|undefined} exchangeDataItem
     * @returns {string}
     */
    createTradeItemBox(item, exchangeDataItem)
    {
        let messageTemplate = this.loadTradeItemTemplate();
        if(!messageTemplate){
            return '';
        }
        let qtyTemplate = this.fetchTemplate('inventoryTradeItemQuantity');
        if(!qtyTemplate){
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            label: item.label,
            description: item.description,
            modifiers: sc.get(item, 'modifiers', []),
            id: item.getInventoryId(),
            qty: item.qty,
            hiddenClass: exchangeDataItem && item.qty === exchangeDataItem ? ' hidden' : '',
            tradeRequirements: ItemsConst.TRADE_ACTIONS.BUY === item.tradeAction ? this.createTradeRequirementsContent(item) : '',
            tradeRewards: ItemsConst.TRADE_ACTIONS.SELL === item.tradeAction ? this.createTradeRewardsContent(item) : '',
            tradeAction: this.itemDisplayEnricher.createTradeActionContent(item),
            tradeActionKey: 'to-be-'+item.tradeAction,
            tradeQuantityContent: this.gameManager.gameEngine.parseTemplate(qtyTemplate, {
                quantityDisplay: item.quantityDisplay || 1,
                quantityMaxDisplay: 0 < item.quantityMaxDisplay ? 'max="' + item.quantityMaxDisplay + '"' : ''
            })
        });
    }

    /**
     * @param {Object} exchangeItems
     * @param {Object} items
     * @param {string} tradeAction
     * @returns {string}
     */
    createConfirmItemsBox(exchangeItems, items, tradeAction)
    {
        // @TODO - BETA - Since we are using one template "inventoryTradeItem", use only one "createConfirmItemsBox".
        if(!this.hasExchangeItems(exchangeItems, 'confirmation trader-object-ui')){
            return '';
        }
        let messageTemplate = this.loadTradeItemTemplate();
        if(!messageTemplate){
            return '';
        }
        let content = '';
        for(let itemUid of Object.keys(exchangeItems)){
            let item = items[itemUid];
            content += this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                key: item.key,
                label: item.label,
                description: item.description,
                modifiers: sc.get(item, 'modifiers', []),
                id: itemUid,
                qty: item.qty,
                hiddenClass: '',
                tradeRequirements: ItemsConst.TRADE_ACTIONS.BUY === tradeAction ? this.createTradeRequirementsContent(item) : '',
                tradeRewards: ItemsConst.TRADE_ACTIONS.SELL === tradeAction ? this.createTradeRewardsContent(item) : '',
                tradeAction: this.itemDisplayEnricher.createTradeActionRemove(item),
                tradeActionKey: tradeAction,
                tradeQuantityContent: exchangeItems[itemUid]
            });
        }
        return content;
    }

    /**
     * @param {string} tradeActionKey
     * @param {string} tradeItems
     * @returns {string}
     */
    createTradeContainer(tradeActionKey, tradeItems)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.fetchTemplate('inventoryTradeContainer');
        if(!messageTemplate){
            return '';
        }
        // @TODO - BETA - Populate requirements totals.
        let confirmRequirements = '';
        let lastErrorData = this.message.result.lastErrorData;
        if(lastErrorData?.itemUid){
            lastErrorData.item = this.fetchItemLabelByUid(lastErrorData.itemUid);
        }
        if(lastErrorData?.requiredItemKey){
            lastErrorData.requiredItem = this.fetchItemLabelByUid(lastErrorData.requiredItemKey);
        }
        let lastErrorMessage = this.gameManager.services.translator.t(
            this.message.result.lastErrorMessage,
            lastErrorData
        );
        return this.gameManager.gameEngine.parseTemplate(
            messageTemplate,
            {
                tradeActionKey,
                confirmRequirements,
                lastErrorMessage,
                tradeActionLabel: ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.CONFIRM,
                cancelLabel: this.gameManager.config.getWithoutLogs('client/trade/titles/cancelLabel', 'Cancel'),
                tradeItems,
                sellValueColumn: ''
            }
        );
    }

    createTradeExchangeContent(exchangeData, templateKey, dataMapper)
    {
        if(!exchangeData){
            return '';
        }
        let keys = Object.keys(exchangeData);
        if(0 === keys.length){
            return '';
        }
        let messageTemplate = this.fetchTemplate(templateKey);
        if(!messageTemplate){
            return '';
        }
        let content = '';
        for(let i of keys){
            content += this.gameManager.gameEngine.parseTemplate(messageTemplate, dataMapper(exchangeData[i]));
        }
        return content;
    }

    createTradeRequirementsContent(item)
    {
        return this.createTradeExchangeContent(
            item.exchangeRequirements,
            'inventoryTradeRequirements',
            (req) => ({ itemKey: item.key, requiredItemKey: req.requiredItemKey, requiredQuantity: req.requiredQuantity })
        );
    }

    createTradeRewardsContent(item)
    {
        return this.createTradeExchangeContent(
            item.exchangeRewards,
            'inventoryTradeRewards',
            (reward) => ({ itemKey: item.key, rewardItemKey: reward.rewardItemKey, rewardQuantity: reward.rewardQuantity })
        );
    }

    /**
     * @param {Object} exchangeItems
     * @param {Object} items
     * @param {Array<Object>} exchangeRewardsB
     * @returns {string}
     */
    createSellValueColumn(exchangeItems, items, exchangeRewardsB)
    {
        let content = '';
        for(let itemUid of Object.keys(exchangeItems)){
            if(!items[itemUid]){
                continue;
            }
            let tempItem = {
                key: items[itemUid].key,
                exchangeRewards: this.fetchExchangeEntriesByKey(items[itemUid].key, exchangeRewardsB)
            };
            content += this.createTradeRewardsContent(tempItem);
        }
        return content;
    }

}

module.exports.TradeItemRenderer = TradeItemRenderer;
