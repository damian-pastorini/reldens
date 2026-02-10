/**
 *
 * Reldens - TradeMessageHandler
 *
 * Handles trade-related messages and UI updates on the client side.
 * Manages trade requests, confirmations, and item exchange display.
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');
const { InventoryConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { UserInterface } = require('../../game/client/user-interface');
const { TradeItemsHelper } = require('./trade-items-helper');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('../../game/client/room-events').RoomEvents} RoomEvents
 * @typedef {import('../../game/client/game-dom').GameDom} GameDom
 * @typedef {import('@reldens/items-system').ItemsClient} ItemsClient
 * @typedef {import('phaser').Scene} Scene
 */
class TradeMessageHandler
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {RoomEvents|boolean} */
        this.roomEvents = sc.get(props, 'roomEvents', false);
        /** @type {Object|boolean} */
        this.message = sc.get(props, 'message', false);
        /** @type {GameManager} */
        this.gameManager = this.roomEvents?.gameManager;
        /** @type {GameDom} */
        this.gameDom = this.gameManager?.gameDom;
        /** @type {Scene} */
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
        /** @type {ItemsClient} */
        this.itemsManager = this.gameManager?.inventory?.manager;
        this.validate();
    }

    validate()
    {
        if(!this.roomEvents){
            ErrorManager.error('Missing RoomEvents.');
        }
        if(!this.message){
            ErrorManager.error('Missing message.');
        }
        if(!this.gameManager){
            ErrorManager.error('Missing GameManager.');
        }
        if(!this.uiScene){
            ErrorManager.error('Missing UiScene.');
        }
        if(!this.itemsManager){
            ErrorManager.error('Missing ItemsManager.');
        }
    }

    /**
     * @returns {boolean|void}
     */
    updateContents()
    {
        if(InventoryConst.ACTIONS.TRADE_START === this.message.act){
            return this.showTradeRequest();
        }
        if(InventoryConst.ACTIONS.TRADE_SHOW === this.message.act){
            return this.showTradeBox();
        }
        return false;
    }

    /**
     * @returns {boolean}
     */
    showTradeRequest()
    {
        // @TODO - BETA - Make all these values configurable.
        let tradeUiKey = 'trade'+this.message.id;
        this.createTradeUi(tradeUiKey);
        this.roomEvents.initUi({
            id: tradeUiKey,
            title: this.gameManager.config.getWithoutLogs(
                'client/trade/titles/tradeRequestFromLabel',
                'Trade request from:'
            ),
            content: this.message.from,
            options: this.gameManager.config.get('client/ui/options/acceptOrDecline'),
            overrideSendOptions: {
                act: InventoryConst.ACTIONS.TRADE_ACCEPTED,
                id: this.message.id
            }
        });
        this.gameDom.getElement('#box-'+tradeUiKey)?.classList?.add('trade-request');
        this.gameDom.getElement('#opt-2-'+tradeUiKey)?.addEventListener('click', () => {
            this.gameDom.getElement('#box-close-'+tradeUiKey)?.click();
        });
        return true;
    }

    /**
     * @returns {boolean|void}
     */
    showTradeBox()
    {
        let tradeUiKey = 'trade'+this.message.id;
        this.createTradeUi(tradeUiKey);
        // this will create or reset the ui content:
        this.roomEvents.initUi({
            id: tradeUiKey,
            title: this.gameManager.services.translator.t('items.tradeWith', {playerName: this.message.with}),
            content: '',
            options: {}
        });
        let boxElement = this.gameDom.getElement('#box-'+tradeUiKey);
        boxElement?.classList?.remove('trade-request');
        boxElement?.classList?.add('trade-in-progress');
        let container = this.gameManager.gameDom.getElement('#box-'+tradeUiKey+' .box-content');
        if(!container){
            Logger.error('Missing container: "#box-'+tradeUiKey+' .box-content".');
            return false;
        }
        if(true === this.message.isTradeEnd){
            this.gameDom.getElement('#box-close-'+'trade'+this.message.id)?.click();
            return true;
        }
        let items = sc.get(this.message, 'items', false);
        let traderItemsData = sc.get(this.message, 'traderItemsData', {});
        let exchangeData = sc.get(this.message, 'exchangeData', {});
        let traderExchangeKey = sc.get(this.message, 'playerToExchangeKey', 'A');
        // my exchange key is the opposite to the received exchange key:
        let myExchangeKey = 'A' === traderExchangeKey ? 'B' : 'A';
        this.updateItemsList(items, container, exchangeData[myExchangeKey]);
        this.updateMyExchangeData((exchangeData[myExchangeKey] || {}), items, myExchangeKey);
        this.updateTraderExchangeData((exchangeData[traderExchangeKey] || {}), traderItemsData, traderExchangeKey);
        return true;
    }

    /**
     * @param {string} tradeUiKey
     * @returns {Object|undefined}
     */
    createTradeUi(tradeUiKey)
    {
        let tradeUi = sc.get(this.roomEvents.tradeUi, tradeUiKey);
        if(!tradeUi){
            this.roomEvents.tradeUi[tradeUiKey] = new UserInterface(
                this.gameManager,
                {id: tradeUiKey, type: 'trade'},
                '/assets/html/dialog-box.html',
                'trade'
            );
            this.roomEvents.tradeUi[tradeUiKey].createUiElement(this.uiScene, 'trade');
        }
        return tradeUi;
    }

    /**
     * @param {Object} items
     * @param {HTMLElement} container
     * @param {Object} exchangeData
     */
    updateItemsList(items, container, exchangeData)
    {
        if(!items){
            return;
        }
        let tradeItems = '';
        let tempItemsList = {};
        for(let i of Object.keys(items)){
            tempItemsList[i] = TradeItemsHelper.createItemInstance(items, i, this.itemsManager);
            tempItemsList[i].tradeAction = 'trade';
            tradeItems += this.createTradeItemBox(tempItemsList[i], sc.get(exchangeData, tempItemsList[i].uid, false));
        }
        container.innerHTML = this.createTradeContainer(tradeItems);
        this.activateItemsBoxActions(tempItemsList);
        this.activateConfirmButtonAction(sc.get(this.message, 'exchangeData', {}));
    }

    /**
     * @param {Object} exchangeData
     */
    activateConfirmButtonAction(exchangeData)
    {
        let confirmButton = this.gameManager.gameDom.getElement('.confirm-'+this.message.id);
        let disconfirmButton = this.gameManager.gameDom.getElement('.disconfirm-'+this.message.id);
        let myExchangeKey = sc.get(this.message, 'playerToExchangeKey', 'A');
        let traderExchangeKey = 'A' === myExchangeKey ? 'B' : 'A';
        let myExchangeData = exchangeData[myExchangeKey] || {};
        let traderExchangeData = exchangeData[traderExchangeKey] || {};
        let myHasItems = 0 < Object.keys(myExchangeData).length;
        let traderHasItems = 0 < Object.keys(traderExchangeData).length;
        let hasAnyItems = myHasItems || traderHasItems;
        let iConfirmed = sc.get(this.message, 'myConfirmed', false);
        if(confirmButton){
            confirmButton.disabled = iConfirmed || !hasAnyItems;
            confirmButton.addEventListener('click', () => {
                this.gameManager.activeRoomEvents.send({
                    act: InventoryConst.ACTIONS.TRADE_ACTION,
                    id: this.message.id,
                    value: this.message.id,
                    sub: ObjectsConst.TRADE_ACTIONS.CONFIRM
                });
            });
        }
        if(disconfirmButton){
            disconfirmButton.disabled = !iConfirmed;
            disconfirmButton.addEventListener('click', () => {
                this.gameManager.activeRoomEvents.send({
                    act: InventoryConst.ACTIONS.TRADE_ACTION,
                    id: this.message.id,
                    value: this.message.id,
                    sub: ObjectsConst.TRADE_ACTIONS.DISCONFIRM
                });
            });
        }
        let cancelButton = this.gameManager.gameDom.getElement('.cancel-'+this.message.id);
        cancelButton?.addEventListener('click', () => {
            this.gameDom.getElement('#box-close-'+'trade'+this.message.id)?.click();
        });
    }

    /**
     * @param {Object} exchangeDataItems
     * @param {Object} items
     * @param {string} exchangeKey
     * @returns {boolean}
     */
    updateMyExchangeData(exchangeDataItems, items, exchangeKey)
    {
        if(0 === Object.keys(exchangeDataItems).length){
            return false;
        }
        let content = this.createConfirmItemsBox(exchangeDataItems, items);
        let itemsContainer = this.gameDom.getElement('.trade-items-boxes .trade-player-col.trade-col-2');
        if(!itemsContainer){
            Logger.error('Missing "'+exchangeKey+'" items container.');
            return false;
        }
        itemsContainer.innerHTML = content;
        this.assignRemoveActions(exchangeDataItems, items);
        return true;
    }

    /**
     * @param {Object} exchangeDataItems
     * @param {Object} traderItemsData
     * @param {string} exchangeKey
     * @returns {boolean}
     */
    updateTraderExchangeData(exchangeDataItems, traderItemsData, exchangeKey)
    {
        if(0 === Object.keys(exchangeDataItems).length){
            return false;
        }
        let content = this.createReceivingItemsBox(exchangeDataItems, traderItemsData);
        let itemsContainer = this.gameDom.getElement('.trade-items-boxes .trade-player-col.trade-col-3');
        if(!itemsContainer){
            Logger.error('Missing "'+exchangeKey+'" items container.');
            return false;
        }
        itemsContainer.innerHTML = content;
        return true;
    }

    /**
     * @param {Object} exchangeItems
     * @param {Object} items
     * @returns {string}
     */
    createConfirmItemsBox(exchangeItems, items)
    {
        // @TODO - BETA - Since we are using one template "inventoryTradeItem", use only one "createConfirmItemsBox".
        let exchangeItemsUids = Object.keys(exchangeItems);
        if(0 === exchangeItemsUids.length){
            Logger.info('Undefined exchange items on confirmation trade-message-handler.', {message: this.message});
            return '';
        }
        let content = '';
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeItem');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeItem".');
            return '';
        }
        for(let itemUid of exchangeItemsUids){
            let qty = exchangeItems[itemUid];
            let item = items[itemUid];
            content += this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                key: item.key,
                label: item.label,
                description: item.description,
                id: itemUid,
                qty: item.qty,
                hiddenClass: '',
                tradeAction: this.createTradeActionRemove(item),
                tradeActionKey: this.message.id,
                tradeQuantityContent: qty
            });
        }
        return content;
    }

    /**
     * @param {Object} exchangeItems
     * @param {Object} traderItemsData
     * @returns {string}
     */
    createReceivingItemsBox(exchangeItems, traderItemsData)
    {
        let exchangeItemsUids = Object.keys(exchangeItems);
        if(0 === exchangeItemsUids.length){
            Logger.info('Undefined exchange items on receive trade-message-handler.', {message: this.message});
            return '';
        }
        let content = '';
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeItem');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeItem".');
            return '';
        }
        for(let itemUid of exchangeItemsUids){
            let qty = exchangeItems[itemUid];
            let item = traderItemsData[itemUid];
            content += this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                key: item.key,
                label: item.label,
                description: item.description,
                id: itemUid,
                qty: item.qty,
                hiddenClass: '',
                tradeAction: '',
                tradeActionKey: this.message.id,
                tradeQuantityContent: qty
            });
        }
        return content;
    }

    /**
     * @param {Object} exchangeItems
     * @param {Object} items
     * @returns {boolean}
     */
    assignRemoveActions(exchangeItems, items)
    {
        let exchangeItemsUids = Object.keys(exchangeItems);
        if(0 === exchangeItemsUids.length){
            Logger.info('Undefined exchange items on remove trade-message-handler.', {message: this.message});
            return false;
        }
        for(let itemUid of exchangeItemsUids){
            let itemContainerSelector = '.pushed-to-trade .trade-item-'+itemUid;
            let itemContainer = this.gameDom.getElement(itemContainerSelector);
            if(!itemContainer){
                Logger.error('Assign trade item "'+itemUid+'" container not found.');
                continue;
            }
            let itemActionButton = this.gameDom.getElement(
                '.pushed-to-trade .trade-item-'+itemUid+' .trade-action-remove'
            );
            if(!itemActionButton){
                Logger.error('Assign trade item "'+itemUid+'" remove button not found.');
                continue;
            }
            let item = items[itemUid];
            itemActionButton.addEventListener('click', () => {
                itemContainer.classList.remove('hidden');
                let dataSend = {
                    act: InventoryConst.ACTIONS.TRADE_ACTION,
                    id: this.message.id,
                    value: 'remove',
                    itemId: itemUid,
                    itemKey: item.key,
                };
                dataSend[ObjectsConst.TRADE_ACTIONS.SUB_ACTION] = ObjectsConst.TRADE_ACTIONS.REMOVE;
                this.gameManager.activeRoomEvents.send(dataSend);
            });
        }
        return true;
    }

    /**
     * @param {string} tradeItems
     * @returns {string}
     */
    createTradeContainer(tradeItems)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradePlayerContainer');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeContainer".');
            return '';
        }
        let templateParams = {
            tradeActionKey: this.message.id,
            confirmLabel: this.gameManager.config.getWithoutLogs(
                'client/trade/titles/confirmLabel',
                this.gameManager.services.translator.t('items.trade.actions.confirm')
            ),
            disconfirmLabel: this.gameManager.config.getWithoutLogs(
                'client/trade/titles/disconfirmLabel',
                this.gameManager.services.translator.t('items.trade.actions.disconfirm')
            ),
            cancelLabel: this.gameManager.config.getWithoutLogs(
                'client/trade/titles/cancelLabel',
                this.gameManager.services.translator.t('items.trade.actions.cancel')
            ),
            myItems: tradeItems,
            myItemsTitle: this.gameManager.config.getWithoutLogs('client/trade/titles/myItems', 'My Items:'),
            pushedToTradeTitle: this.gameManager.config.getWithoutLogs(
                'client/trade/titles/pushedToTradeTitle',
                'Sending:'
            ),
            gotFromTradeTitle: this.gameManager.config.getWithoutLogs(
                'client/trade/titles/gotFromTradeTitle',
                'Receiving:'
            ),
            playerConfirmedLabel: this.playerConfirmedLabel(),
        };
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, templateParams);
    }

    /**
     * @returns {string}
     */
    playerConfirmedLabel()
    {
        if(!this.message.playerConfirmed){
            return '';
        }
        return this.gameManager.config.getWithoutLogs(
            'client/trade/titles/playerConfirmedLabel',
            '%playerName CONFIRMED'
        ).replace('%playerName', this.message.with);
    }

    /**
     * @param {Object} item
     * @param {number|boolean} exchangeDataItem
     * @returns {string}
     */
    createTradeItemBox(item, exchangeDataItem)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeItem');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeItem".');
            return '';
        }
        let qtyTemplate = this.uiScene.cache.html.get('inventoryTradeItemQuantity');
        if(!qtyTemplate){
            Logger.error('Missing template "inventoryTradeItemQuantity".');
            return '';
        }
        let qty = exchangeDataItem || 0;
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            label: item.label,
            description: item.description,
            id: item.getInventoryId(),
            qty: item.qty,
            hiddenClass: 0 < qty && item.qty === qty ? ' hidden' : '',
            tradeAction: this.createTradeActionContent(item),
            tradeActionKey: 'to-be-'+item.tradeAction,
            tradeQuantityContent: this.gameManager.gameEngine.parseTemplate(qtyTemplate, {
                quantityDisplay: item.quantityDisplay || 1,
                quantityMaxDisplay: 0 < item.quantityMaxDisplay ? 'max="' + item.quantityMaxDisplay + '"' : ''
            })
        });
    }

    /**
     * @param {Object} item
     * @param {string} tradeAction
     * @returns {string}
     */
    createTradeActionContent(item, tradeAction)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeAction');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeAction".');
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            id: item.getInventoryId(),
            tradeAction: tradeAction || sc.get(item, 'tradeAction', '')
        });
    }

    /**
     * @param {Object} item
     * @returns {string}
     */
    createTradeActionRemove(item)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeActionRemove');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeActionRemove".');
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            id: item.uid,
            tradeAction: 'remove'
        });
    }

    /**
     * @param {Object<string, Object>} items
     */
    activateItemsBoxActions(items)
    {
        for(let i of Object.keys(items)){
            let item = items[i];
            let imageContainer = this.gameDom.getElement('.trade-item-'+item.uid+' .image-container');
            if(!imageContainer){
                Logger.error('Image container for item "'+item.uid+'" not found.');
                continue;
            }
            imageContainer.addEventListener('click', () => {
                let tradeActionsContainer = this.gameDom.getElement(
                    '.trade-item-'+item.uid+' .actions-container.trade-actions'
                );
                tradeActionsContainer?.classList?.toggle('trade-actions-expanded');
            });
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
                    act: InventoryConst.ACTIONS.TRADE_ACTION,
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

module.exports.TradeMessageHandler = TradeMessageHandler;
