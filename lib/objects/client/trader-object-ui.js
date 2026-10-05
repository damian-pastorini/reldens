/**
 *
 * Reldens - TraderObjectUi
 *
 * Manages trader object UI rendering and interaction on the client side.
 *
 */

const { TradeItemsHelper } = require('../../inventory/client/trade-items-helper');
const { ItemDisplayEnricher } = require('../../inventory/client/item-display-enricher');
const { TradeItemRenderer } = require('./trade-item-renderer');
const { ObjectsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/client/room-events').RoomEvents} RoomEvents
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager - CUSTOM DYNAMIC
 * @typedef {import('../../game/client/game-dom').GameDom} GameDom
 * @typedef {import('@reldens/items-system').ItemsManager} ItemsManager
 * @typedef {import('../../game/client/user-interface').UserInterface} UserInterface
 *
 * @typedef {Object} TraderObjectUiProps
 * @property {RoomEvents} roomEvents
 * @property {Object} message
 */
class TraderObjectUi
{

    /**
     * @param {TraderObjectUiProps} props
     */
    constructor(props)
    {
        // @TODO - BETA - Rename class to TraderObjectMessageHandler, split in several services.
        /** @type {RoomEvents|false} */
        this.roomEvents = sc.get(props, 'roomEvents', false);
        /** @type {Object|false} */
        this.message = sc.get(props, 'message', false);
        /** @type {GameManager|undefined} */
        this.gameManager = this.roomEvents?.gameManager;
        /** @type {GameDom|undefined} */
        this.gameDom = this.gameManager?.gameDom;
        /** @type {Object|undefined} */
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
        /** @type {ItemsManager|undefined} */
        this.itemsManager = this.gameManager?.inventory?.manager;
        /** @type {UserInterface|undefined} */
        this.objectUi = this.roomEvents?.objectsUi[this.message?.id];
        this.itemDisplayEnricher = new ItemDisplayEnricher(this.gameDom, this.uiScene, this.gameManager);
        this.renderer = new TradeItemRenderer(this.gameManager, this.uiScene, this.itemDisplayEnricher, this.message);
        this.setConfirmMessages();
    }

    /**
     * @returns {boolean}
     */
    validate()
    {
        if(!this.roomEvents){
            Logger.error('Missing RoomEvents on TraderObjectUi.');
            return false;
        }
        if(!this.message){
            Logger.error('Missing message on TraderObjectUi.');
            return false;
        }
        if(!this.gameManager){
            Logger.error('Missing GameManager on TraderObjectUi.');
            return false;
        }
        if(!this.uiScene){
            Logger.error('Missing UiScene on TraderObjectUi.');
            return false;
        }
        if(!this.itemsManager){
            Logger.error('Missing ItemsManager on TraderObjectUi.');
            return false;
        }
        if(!this.objectUi){
            Logger.error('Missing objectUi on TraderObjectUi.');
            return false;
        }
        return true;
    }

    /**
     * @param {string} action
     * @returns {string|false}
     */
    mapInventoryKeyFromAction(action)
    {
        return sc.get({buy: 'A', sell: 'B'}, action, false);
    }

    /**
     * @returns {boolean}
     */
    setConfirmMessages()
    {
        if(!this.gameManager){
            return false;
        }
        this.confirmMessages = {
            buy: this.gameManager.services.translator.t('objects.trader.buyConfirmed'),
            sell: this.gameManager.services.translator.t('objects.trader.sellConfirmed')
        };
        return true;
    }

    /**
     * @returns {boolean}
     */
    updateContents()
    {
        let container = this.gameManager.gameDom.getElement('#box-'+this.objectUi.id+' .box-content');
        if(!container){
            Logger.error('Missing container: "#box-'+this.objectUi.id+' .box-content".');
            return false;
        }
        let boxElement = this.gameManager.gameDom.getElement('#box-'+this.objectUi.id);
        let tradeAction = this.message.result.action;
        if(ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.CONFIRM === this.message.result.subAction){
            container.innerHTML = this.confirmMessages[tradeAction];
            boxElement?.classList?.remove('trade-in-progress');
            return true;
        }
        let items = sc.get(this.message.result, 'items', false);
        let inventoryKey = this.mapInventoryKeyFromAction(tradeAction);
        let exchangeData = sc.get(this.message.result, 'exchangeData', false);
        let exchangeItems = sc.get(exchangeData, inventoryKey, false);
        let exchangeRequirementsA = this.message.result.exchangeRequirementsA || [];
        let exchangeRewardsB = this.message.result.exchangeRewardsB || [];
        boxElement?.classList?.add('trade-in-progress');
        this.updateItemsList(items, tradeAction, exchangeRequirementsA, exchangeRewardsB, container, exchangeItems);
        this.updateExchangeData(exchangeItems, tradeAction, exchangeRequirementsA, exchangeRewardsB, items);
        return true;
    }

    /**
     * @param {Object} items
     * @param {string} tradeAction
     * @param {Array<Object>} exchangeRequirementsA
     * @param {Array<Object>} exchangeRewardsB
     * @param {HTMLElement} container
     * @param {Object|false} exchangeData
     */
    updateItemsList(items, tradeAction, exchangeRequirementsA, exchangeRewardsB, container, exchangeData)
    {
        if(!items){
            //Logger.debug('Missing items for updateItemsList method.');
            return false;
        }
        let tradeItems = '';
        let tempItemsList = {};
        for(let i of Object.keys(items)){
            tempItemsList[i] = TradeItemsHelper.createItemInstance(items, i, this.itemsManager);
            tempItemsList[i].tradeAction = tradeAction;
            tempItemsList[i].exchangeRequirements = this.renderer.fetchExchangeEntriesByKey(items[i].key, exchangeRequirementsA);
            tempItemsList[i].exchangeRewards = this.renderer.fetchExchangeEntriesByKey(items[i].key, exchangeRewardsB);
            if('sell' === tradeAction){
                if(!tempItemsList[i].exchangeRewards || 0 === Object.keys(tempItemsList[i].exchangeRewards).length){
                    delete tempItemsList[i];
                    continue;
                }
            }
            tradeItems += this.renderer.createTradeItemBox(tempItemsList[i], sc.get(exchangeData, tempItemsList[i].uid, false));
        }
        container.innerHTML = this.renderer.createTradeContainer(tradeAction, tradeItems);
        this.activateItemsBoxActions(tempItemsList);
        this.activateItemInfoToggles(tempItemsList);
        this.activateConfirmButtonAction(tradeAction);
        this.activateCancelButtonAction(tradeAction);
    }

    /**
     * @param {string} tradeAction
     */
    activateConfirmButtonAction(tradeAction)
    {
        let confirmButton = this.gameManager.gameDom.getElement('.confirm-'+tradeAction);
        let dataSend = {
            act: ObjectsConst.OBJECT_INTERACTION,
            id: this.message.id,
            value: tradeAction,
            sub: ObjectsConst.TRADE_ACTIONS.CONFIRM
        };
        confirmButton?.addEventListener('click', () => {
            this.gameManager.activeRoomEvents.send(dataSend);
        });
    }

    /**
     * @param {Object|false} exchangeData
     * @param {string} tradeAction
     * @param {Array<Object>} exchangeRequirementsA
     * @param {Array<Object>} exchangeRewardsB
     * @param {Object} items
     * @returns {boolean}
     */
    updateExchangeData(exchangeData, tradeAction, exchangeRequirementsA, exchangeRewardsB, items)
    {
        if(false === exchangeData){
            return false;
        }
        let content = this.renderer.createConfirmItemsBox(exchangeData, items, tradeAction);
        let itemsContainer = null;
        if('buy' === tradeAction){
            itemsContainer = this.gameDom.getElement('.trade-container-buy .trade-col.trade-col-2');
        }
        if('sell' === tradeAction){
            itemsContainer = this.gameDom.getElement('.trade-container-sell .trade-col.trade-col-2');
        }
        if(null === itemsContainer){
            Logger.error('Missing "'+tradeAction+'" items container.', {message: this.message});
            return false;
        }
        itemsContainer.innerHTML = content;
        if('sell' === tradeAction){
            let sellValueContainer = this.gameDom.getElement('.trade-container-sell .trade-col.trade-col-3');
            if(sellValueContainer){
                sellValueContainer.innerHTML = this.renderer.createSellValueColumn(exchangeData, items, exchangeRewardsB);
            }
        }
        this.activateExchangeItemInfoToggles(exchangeData, items, tradeAction);
        this.assignRemoveActions(exchangeData, items, tradeAction);
        return true;
    }

    /**
     * @param {Object} exchangeItems
     * @param {Object} items
     * @param {string} tradeAction
     * @returns {boolean}
     */
    assignRemoveActions(exchangeItems, items, tradeAction)
    {
        // @NOTE: this will be the case if you don't have a required item.
        if(!this.renderer.hasExchangeItems(exchangeItems, 'remove trader-object-ui')){
            return false;
        }
        for(let itemUid of Object.keys(exchangeItems)){
            let itemContainerSelector = '.trade-item-to-be-'+tradeAction+'.trade-item-'+itemUid;
            let itemContainer = this.gameDom.getElement(itemContainerSelector);
            if(!itemContainer){
                Logger.error('Assign trade item "'+itemUid+'" container not found.', {message: this.message});
                continue;
            }
            let itemActionButton = this.gameDom.getElement(
                '.trade-item-'+tradeAction+'.trade-item-'+itemUid+' .trade-action-remove'
            );
            if(!itemActionButton){
                Logger.error('Assign trade item "'+itemUid+'" remove button not found.', {message: this.message});
                continue;
            }
            let item = items[itemUid];
            itemActionButton.addEventListener('click', () => {
                itemContainer.classList.remove('hidden');
                let dataSend = {
                    act: ObjectsConst.OBJECT_INTERACTION,
                    id: this.message.id,
                    value: tradeAction,
                    itemId: itemUid,
                    itemKey: item.key,
                };
                dataSend[ObjectsConst.TRADE_ACTIONS.SUB_ACTION] = ObjectsConst.TRADE_ACTIONS.REMOVE;
                this.gameManager.activeRoomEvents.send(dataSend);
            });
        }
        return true;
    }

    activateCancelButtonAction(tradeAction)
    {
        let cancelButton = this.gameDom.getElement('.cancel-' + tradeAction);
        if(!cancelButton){
            return;
        }
        cancelButton.addEventListener('click', () => {
            let boxClose = this.gameDom.getElement('#box-' + this.objectUi.id + ' .box-close');
            boxClose?.click();
        });
    }

    activateItemInfoToggles(items)
    {
        this.gameDom.getDocument().addEventListener('click', () => {
            this.itemDisplayEnricher.closeAllItemInfoBoxes();
        });
        for(let i of Object.keys(items)){
            let item = items[i];
            this.itemDisplayEnricher.activateItemInfoToggle(
                '.trade-item-to-be-' + item.tradeAction + '.trade-item-' + item.uid
            );
        }
    }

    activateExchangeItemInfoToggles(exchangeItems, items, tradeAction)
    {
        for(let itemUid of Object.keys(exchangeItems)){
            if(!items[itemUid]){
                continue;
            }
            this.itemDisplayEnricher.activateItemInfoToggle(
                '.trade-item-' + tradeAction + '.trade-item-' + itemUid
            );
        }
    }

    /**
     * @param {Object} items
     */
    activateItemsBoxActions(items)
    {
        for(let i of Object.keys(items)){
            let item = items[i];
            let itemContainerSelector = '.trade-item-to-be-'+item.tradeAction+'.trade-item-'+item.uid
                +' .trade-action-'+item.tradeAction;
            let itemButtonSelector = itemContainerSelector+' button';
            let itemActionButton = this.gameDom.getElement(itemButtonSelector);
            if(!itemActionButton){
                Logger.error('Activate trade item "'+item.uid+'" action button not found.');
                continue;
            }
            itemActionButton.addEventListener('click', () => {
                let qtySelector = this.gameDom.getElement('.trade-item-'+item.getInventoryId()+' .item-qty input');
                let qtySelected = qtySelector?.value || 1;
                let dataSend = {
                    act: ObjectsConst.OBJECT_INTERACTION,
                    id: this.message.id,
                    value: item.tradeAction,
                    itemId: item.getInventoryId(),
                    itemKey: item.key,
                    qty: Number(qtySelected)
                };
                dataSend[ObjectsConst.TRADE_ACTIONS.SUB_ACTION] = ObjectsConst.TRADE_ACTIONS.ADD;
                this.gameManager.activeRoomEvents.send(dataSend);
            });
        }
    }

}

module.exports.TraderObjectUi = TraderObjectUi;
