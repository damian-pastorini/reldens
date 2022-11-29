/**
 *
 * Reldens - TradeMessageHandler
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');
const { ItemsConst } = require('@reldens/items-system');
const { InventoryConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { UserInterface } = require('../../game/client/user-interface');

class TradeMessageHandler
{

    constructor(props)
    {
        this.roomEvents = sc.get(props, 'roomEvents', false);
        this.message = sc.get(props, 'message', false);
        this.gameManager = this.roomEvents?.gameManager;
        this.gameDom = this.gameManager?.gameDom;
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
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

    updateContents()
    {
        if(InventoryConst.ACTIONS.TRADE_START === this.message.act){
            return this.showTradeRequest();
        }
        if(InventoryConst.ACTIONS.TRADE_SHOW === this.message.act){
            return this.showTradeBox();
        }
    }

    showTradeRequest()
    {
        // @TODO - BETA - Make all these values configurable.
        let tradeUiKey = 'trade'+this.message.id;
        let uiDoesNotExists = this.createTradeUi(tradeUiKey);
        // this will create or reset the ui content:
        this.roomEvents.initUi({
            id: tradeUiKey,
            title: 'Trade request from:',
            content: this.message.from,
            options: {'1':{'label':'Accept','value':1},'2':{'label':'Decline','value':2}},
            overrideSendOptions: {
                act: InventoryConst.ACTIONS.TRADE_ACCEPTED,
                id: this.message.id
            }
        });
        if(uiDoesNotExists){
            this.gameDom.getElement('#opt-2-'+tradeUiKey)?.addEventListener('click', () => {
                // this will send the close click action to the server:
                this.gameDom.getElement('#box-close-'+tradeUiKey)?.click();
            });
        }
    }

    showTradeBox()
    {
        let tradeUiKey = 'trade'+this.message.id;
        this.createTradeUi(tradeUiKey);
        // this will create or reset the ui content:
        this.roomEvents.initUi({
            id: tradeUiKey,
            title: 'Trading with '+this.message.with,
            content: '',
            options: {}
        });
        let container = this.gameManager.gameDom.getElement('#box-'+tradeUiKey+' .box-content');
        if(!container){
            Logger.error('Missing container: "#box-'+tradeUiKey+' .box-content".')
            return false;
        }
        let items = sc.get(this.message, 'items', false);
        let traderItemsData = sc.get(this.message, 'traderItemsData', {});
        let exchangeData = sc.get(this.message, 'exchangeData', {});
        let traderExchangeKey = sc.get(this.message, 'playerToExchangeKey', {});
        // my exchange key is the opposite to the received exchange key:
        let myExchangeKey = 'A' === traderExchangeKey ? 'B' : 'A';
        // console.log({traderItemsData, myExchangeKey, traderExchangeKey, messageId: this.message.id, currentPlayerId: this.gameManager.getCurrentPlayer().playerId});
        this.updateItemsList(items, container, exchangeData[myExchangeKey]);
        this.updateMyExchangeData((exchangeData[myExchangeKey] || {}), items, myExchangeKey);
        this.updateTraderExchangeData((exchangeData[traderExchangeKey] || {}), traderItemsData, traderExchangeKey);
    }

    isMyPushedItem()
    {
        return this.gameManager.getCurrentPlayer().playerId === this.message.id;
    }

    createTradeUi(tradeUiKey)
    {
        let uiDoesNotExists = !sc.hasOwn(this.roomEvents.tradeUi, tradeUiKey);
        if (uiDoesNotExists) {
            this.roomEvents.tradeUi[tradeUiKey] = new UserInterface(this.gameManager, {id: tradeUiKey, type: 'trade'});
            this.roomEvents.tradeUi[tradeUiKey].createUiElement(this.uiScene, 'trade');
        }
        return uiDoesNotExists;
    }

    updateItemsList(items, container, exchangeData)
    {
        if(!items){
            return;
        }
        let tradeItems = '';
        let tempItemsList = {};
        for(let i of Object.keys(items)){
            let messageItem = items[i];
            let itemsProps = Object.assign({manager: this.itemsManager}, messageItem, {uid: i});
            let itemClass = sc.get(
                this.itemsManager.itemClasses,
                itemsProps.key,
                this.itemsManager.types.classByTypeId(itemsProps.type)
            );
            tempItemsList[i] = new itemClass(itemsProps);
            tempItemsList[i].quantityDisplay = 1;
            tempItemsList[i].quantityMaxDisplay = Math.max(tempItemsList[i].qty_limit, messageItem.qty);
            tempItemsList[i].tradeAction = 'trade';
            tradeItems += this.createTradeItemBox(tempItemsList[i], sc.get(exchangeData, tempItemsList[i].uid, false));
        }
        container.innerHTML = this.createTradeContainer(tradeItems);
        this.activateItemsBoxActions(tempItemsList);
        this.activateConfirmButtonAction();
    }

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
            this.gameManager.activeRoomEvents.room.send('*', dataSend);
        });
    }

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
        this.assignRemoveActions(exchangeDataItems, items, exchangeKey);
        return true;
    }

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

    createConfirmItemsBox(exchangeItems, items)
    {
        let exchangeItemsUids = Object.keys(exchangeItems);
        if(0 === exchangeItemsUids.length){
            Logger.error('Undefined exchange items.');
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

    createReceivingItemsBox(exchangeItems, traderItemsData)
    {
        let exchangeItemsUids = Object.keys(exchangeItems);
        if(0 === exchangeItemsUids.length){
            Logger.error('Undefined exchange items.');
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

    assignRemoveActions(exchangeItems, items, tradeAction)
    {
        let exchangeItemsUids = Object.keys(exchangeItems);
        if(0 === exchangeItemsUids.length){
            Logger.error('Undefined exchange items.');
            return false;
        }
        for(let itemUid of exchangeItemsUids){
            let itemContainerSelector = '.trade-item-to-be-'+tradeAction+'.trade-item-'+itemUid;
            let itemContainer = this.gameDom.getElement(itemContainerSelector);
            if(!itemContainer){
                Logger.error('Assign trade item "'+itemUid+'" container not found.');
                continue;
            }
            let itemActionButton = this.gameDom.getElement(
                '.trade-item-'+tradeAction+'.trade-item-'+itemUid+' .trade-action-remove'
            );
            if(!itemActionButton){
                Logger.error('Assign trade item "'+itemUid+'" remove button not found.');
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
                this.gameManager.activeRoomEvents.room.send('*', dataSend);
            });
        }
        return true;
    }

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
            tradeActionLabel: ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.CONFIRM,
            myItems: tradeItems,
            myItemsTitle: this.gameManager.config.get('trade/titles/myItems', 'My Items:'),
            pushedToTradeTitle: this.gameManager.config.get('trade/titles/pushedToTradeTitle', 'Sending:'),
            gotFromTradeTitle: this.gameManager.config.get('trade/titles/gotFromTradeTitle', 'Receiving:'),
        };
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, templateParams);
    }

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
                    act: InventoryConst.ACTIONS.TRADE_ACTION,
                    id: this.message.id,
                    value: item.tradeAction,
                    itemId: item.getInventoryId(),
                    itemKey: item.key,
                    qty: Number(qtySelected)
                };
                dataSend[ObjectsConst.TRADE_ACTIONS.SUB_ACTION] = ObjectsConst.TRADE_ACTIONS.ADD;
                this.gameManager.activeRoomEvents.room.send('*', dataSend);
            });
        }
    }

}

module.exports.TradeMessageHandler = TradeMessageHandler;