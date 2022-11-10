/**
 *
 * Reldens - TraderObjectUi
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');
const { ItemsConst } = require('@reldens/items-system');
const { ObjectsConst } = require('../constants');

class TraderObjectUi
{

    constructor(props)
    {
        this.roomEvents = sc.get(props, 'roomEvents', false);
        this.message = sc.get(props, 'message', false);
        this.gameManager = this.roomEvents?.gameManager;
        this.gameDom = this.gameManager?.gameDom;
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
        this.itemsManager = this.gameManager?.inventory?.manager;
        this.objectUi = this.roomEvents?.objectsUi[this.message?.id];
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
        if(!this.objectUi){
            ErrorManager.error('Missing objectUi.');
        }
    }

    updateContents()
    {
        let container = this.gameManager.gameDom.getElement('#box-'+this.objectUi.id+' .box-content');
        if(!container){
            Logger.error('Missing container: "#box-'+this.objectUi.id+' .box-content".')
            return false;
        }
        let items = sc.get(this.message.result, 'items', false);
        let exchangeData = sc.get(this.message.result, 'exchangeData', false);
        let exchangeRequirementsA = this.message.result.exchangeRequirementsA || [];
        let exchangeRewardsB = this.message.result.exchangeRewardsB || [];
        let tradeAction = this.message.result.action;
        this.updateItemsList(items, tradeAction, exchangeRequirementsA, exchangeRewardsB, container);
        this.updateExchangeData(exchangeData, tradeAction, exchangeRequirementsA, exchangeRewardsB, container);
    }

    updateItemsList(items, tradeAction, exchangeRequirementsA, exchangeRewardsB, container)
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
            tempItemsList[i].quantityDisplay = 0 < messageItem.qty ? +messageItem.qty : '';
            tempItemsList[i].tradeAction = tradeAction;
            tempItemsList[i].exchangeRequirements = this.fetchItemRequirements(itemsProps.key, exchangeRequirementsA);
            tempItemsList[i].exchangeRewards = this.fetchItemRewards(i, exchangeRewardsB);
            tradeItems += this.createTradeItemBox(tempItemsList[i]);
        }
        container.innerHTML = this.createTradeContainer(tradeAction, tradeItems);
        this.activateItemsBoxActions(tempItemsList);
        this.activateConfirmButtonAction(tradeAction);
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

    updateExchangeData(exchangeData, tradeAction, exchangeRequirementsA, exchangeRewardsB, container)
    {
        // console.log(this.message);
        // @TODO - WIP.
    }

    createTradeContainer(tradeActionKey, tradeItems)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeContainer');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeContainer".');
            return '';
        }
        let confirmRequirements = '';
        let tradeItemsBuy = ItemsConst.TRADE_ACTIONS.BUY === tradeActionKey ? tradeItems : '';
        let tradeItemsSell = ItemsConst.TRADE_ACTIONS.SELL === tradeActionKey ? tradeItems : '';
        return this.gameManager.gameEngine.parseTemplate(
            messageTemplate,
            {
                tradeActionKey,
                confirmRequirements,
                tradeActionLabel: 'confirm',
                tradeItemsBuy,
                tradeItemsSell
            }
        );
    }

    fetchItemRequirements(itemKey, exchangeRequirements)
    {
        if(0 === exchangeRequirements.length){
            return false;
        }
        let itemExchangeRequirements = {};
        for(let exchangeRequirement of exchangeRequirements){
            if(itemKey !== exchangeRequirement.itemKey){
                continue;
            }
            itemExchangeRequirements[exchangeRequirement.itemKey] = exchangeRequirement;
        }
        return itemExchangeRequirements;
    }

    fetchItemRewards(itemKey, exchangeRewards)
    {
        if(0 === exchangeRewards.length){
            return false;
        }
        let itemExchangeRewards = {};
        for(let exchangeReward of exchangeRewards){
            if(itemKey !== exchangeReward.itemKey){
                continue;
            }
            itemExchangeRewards[exchangeReward.itemKey] = exchangeReward;
        }
        return itemExchangeRewards;
    }

    createTradeItemBox(item)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeItem');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeItem".');
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            label: item.label,
            description: item.description,
            id: item.getInventoryId(),
            qty: item.qty,
            tradeRequirements: ItemsConst.TRADE_ACTIONS.BUY === item.tradeAction ? this.createTradeRequirementsContent(item) : '',
            tradeRewards: ItemsConst.TRADE_ACTIONS.SELL === item.tradeAction ? this.createTradeRewardsContent(item) : '',
            tradeAction: this.createTradeActionContent(item),
            tradeActionKey: item.tradeAction,
            quantityDisplay: item.quantityDisplay || 1,
            quantityMax: 0 < item.qty_limit ? 'max="'+item.qty_limit+'"' : ''
        });
    }

    createTradeRequirementsContent(item)
    {
        if(!item.exchangeRequirements){
            return '';
        }
        let requirementsKeys = Object.keys(item.exchangeRequirements);
        if(0 === requirementsKeys.length){
            return '';
        }
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeRequirements');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeRequirements".');
            return '';
        }
        let content = '';
        for(let i of requirementsKeys){
            let requirement = item.exchangeRequirements[i];
            content += this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                itemKey: item.key,
                requiredItemKey: requirement.requiredItemKey,
                requiredQuantity: requirement.requiredQuantity
            });
        }
        return content;
    }

    createTradeRewardsContent(item)
    {
        if(!item.exchangeRewards){
            return '';
        }
        let rewardsKeys = Object.keys(item.exchangeRewards);
        if(0 === rewardsKeys.length){
            return '';
        }
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeRewards');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeRewards".');
            return '';
        }
        let content = '';
        for(let i of rewardsKeys){
            let reward = item.exchangeRewards[i];
            content += this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                itemKey: item.key,
                rewardItemKey: reward.rewardItemKey,
                rewardQuantity: reward.rewardQuantity
            });
        }
        return content;
    }

    createTradeActionContent(item)
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
            tradeAction: sc.get(item, 'tradeAction', '')
        });
    }

    activateItemsBoxActions(items)
    {
        for(let i of Object.keys(items)){
            let item = items[i];
            let itemButtonSelector = '#trade-item-'+item.uid+' .trade-action-'+item.tradeAction+' button';
            let itemActionButton = this.gameDom.getElement(itemButtonSelector);
            if(!itemActionButton){
                Logger.error('Item action not found.');
                continue;
            }
            itemActionButton.addEventListener('click', () => {
                let qtySelector = this.gameDom.getElement('#trade-item-'+item.getInventoryId()+' .item-qty input');
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
                this.gameManager.activeRoomEvents.room.send('*', dataSend);
            });
        }
    }

}

module.exports.TraderObjectUi = TraderObjectUi;