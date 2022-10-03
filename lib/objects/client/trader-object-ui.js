/**
 *
 * Reldens - TraderObjectUi
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');

class TraderObjectUi
{

    constructor(props)
    {
        this.roomEvents = sc.get(props, 'roomEvents', false);
        this.message = sc.get(props, 'message', false);
        this.gameManager = this.roomEvents.gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.uiScene = this.gameManager.gameEngine.uiScene;
        this.itemsManager = this.gameManager.inventory.manager;
        this.objectUi = this.roomEvents.objectsUi[this.message.id];
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
        let tempItemsList = {};
        let items = this.message.result.items;
        let exchangeRequirementsA = this.message.result.exchangeRequirementsA;
        container.innerHTML = this.createTradeContainer(this.message.result.action);
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
            tempItemsList[i].tradeAction = this.message.result.action;
            tempItemsList[i].exchangeRequirements = this.fetchItemRequirements(i, exchangeRequirementsA);
            container.innerHTML += this.createTradeItemBox(tempItemsList[i]);
            this.activateItemBoxActions(tempItemsList[i]);
        }
    }

    createTradeContainer(tradeActionKey)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeContainer');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeContainer".');
            return '';
        }
        let confirmBoxContents = ''; // @TODO - HEREEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE!!
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {tradeActionKey, confirmBoxContents});
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
            tradeRequirements: this.createTradeRequirementsContent(item),
            tradeAction: this.createTradeActionContent(item),
            tradeActionKey: item.tradeAction,
            quantityDisplay: sc.get(item, 'quantityDisplay', '')
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

    activateItemBoxActions(item)
    {

    }

}

module.exports.TraderObjectUi = TraderObjectUi;