/**
 *
 * Reldens - InventoryPlugin
 *
 */

const { InventoryUi } = require('./inventory-ui');
const { InventoryReceiver } = require('./inventory-receiver');
const { TradeTargetAction } = require('./exchange/trade-target-action');
const { TradeMessageListener } = require('./trade-message-listener');
const { UserInterface } = require('../../game/client/user-interface');
const { PluginInterface } = require('../../features/plugin-interface');
const { TemplatesHandler } = require('./templates-handler');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const Translations = require('./snippets/en_US');
const { InventoryConst } = require('../constants');
const { ItemsEvents, ItemsConst } = require('@reldens/items-system');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class InventoryPlugin extends PluginInterface
{

    setup(props)
    {
        // @TODO - BETA - Refactor plugin, extract all the methods into new classes.
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        this.tradeTargetAction = new TradeTargetAction();
        this.setTradeUi();
        this.listenEvents();
        this.setListener();
        this.setTranslations();
    }

    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, InventoryConst.MESSAGE.DATA_VALUES);
    }

    setTradeUi()
    {
        if(!this.gameManager){
            return false;
        }
        // @TODO - BETA - Make the dialogBox template load on it's own so we can reuse the same object from cache.
        // @NOTE: the tradeUi works as preload for the trade template which at the end is an dialog-box.
        this.tradeUi = new UserInterface(this.gameManager, {id: 'trade', type: 'trade'});
    }

    setListener()
    {
        if(!this.gameManager){
            return false;
        }
        this.gameManager.config.client.message.listeners['trade'] = new TradeMessageListener();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            this.onPlayerAdd(key, roomEvents, player);
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            TemplatesHandler.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            return this.onPreloadUiScene(preloadScene);
        });
        this.events.on('reldens.gameEngineShowTarget', (gameEngine, target, previousTarget, targetName) => {
            this.tradeTargetAction.showTargetExchangeAction(this.gameManager, target, previousTarget, targetName);
        });
    }

    onPreloadUiScene(preloadScene)
    {
        this.uiManager = new InventoryUi(preloadScene);
        this.uiManager.createUi();
        let manager = preloadScene.gameManager.inventory.manager;
        let equipmentPanel = this.activateGroupAndEquipmentUi(preloadScene, manager);
        let inventoryPanel = this.activateInventoryUi(preloadScene, manager, equipmentPanel);
        this.listenInventoryEvents(preloadScene, inventoryPanel, equipmentPanel);
    }

    activateGroupAndEquipmentUi(preloadScene, manager)
    {
        let equipmentElement = preloadScene.getUiElement('equipment');
        if(!equipmentElement){
            Logger.warning('EquipmentElement not found.', equipmentElement);
            return false;
        }
        let equipmentPanel = equipmentElement.getChildByProperty(
            'id',
            InventoryConst.EQUIPMENT_ITEMS
        );
        if(!equipmentPanel){
            Logger.warning('Equipment UI not found.', equipmentPanel);
            return false;
        }
        let inventoryGroups = sc.get(manager, 'groups', {});
        if(Object.keys(inventoryGroups).length){
            let equipmentItemsElement = preloadScene.gameManager.gameDom.getElement(
                '#' + InventoryConst.EQUIPMENT_ITEMS
            );
            if(!equipmentItemsElement){
                Logger.warning('Element "equipmentItemsElement" not found.');
                return false;
            }
            equipmentItemsElement.innerHTML = '';
            let orderedGroups = this.sortGroups(inventoryGroups);
            for (let i of orderedGroups){
                let output = this.createGroupBox(inventoryGroups[i], preloadScene.gameManager, preloadScene);
                preloadScene.gameManager.gameDom.appendToElement('#' + InventoryConst.EQUIPMENT_ITEMS, output);
            }
        }
        return equipmentPanel;
    }

    activateInventoryUi(preloadScene, manager, equipmentPanel)
    {
        let inventoryElement = preloadScene.getUiElement('inventory');
        if(!inventoryElement){
            Logger.warning('InventoryElement not found.', inventoryElement);
            return false;
        }
        let inventoryPanel = inventoryElement.getChildByProperty(
            'id',
            InventoryConst.INVENTORY_ITEMS
        );
        if(!inventoryPanel){
            Logger.warning('Inventory UI not found.', inventoryPanel);
            return false;
        }
        let itemsElements = sc.get(manager, 'items', {});
        let itemsKeys = Object.keys(itemsElements);
        if(0 < itemsKeys.length){
            for (let i of itemsKeys){
                let item = itemsElements[i];
                this.displayItem(item, preloadScene, equipmentPanel, inventoryPanel, i);
            }
        }
        return inventoryPanel;
    }

    onPlayerAdd(key, roomEvents, player)
    {
        if(key !== roomEvents.room.sessionId){
            return false;
        }
        if(!roomEvents.gameManager.inventory){
            this.createInventoryInstance(player, roomEvents);
        }
        roomEvents.room.onMessage('*', (message) => {
            roomEvents.gameManager.inventory.processMessage(message);
        });
    }

    createInventoryInstance(player, roomEvents)
    {
        let receiverProps = {
            owner: player,
            ownerIdProperty: 'sessionId',
            gameManager: roomEvents.gameManager
        };
        let inventoryClasses = roomEvents.gameManager.config.getWithoutLogs('client/customClasses/inventory/items', {});
        if(inventoryClasses && 0 < Object.keys(inventoryClasses).length){
            receiverProps.itemClasses = inventoryClasses;
        }
        let groupClasses = roomEvents.gameManager.config.getWithoutLogs('client/customClasses/inventory/groups', {});
        if(groupClasses && Object.keys(groupClasses).length){
            receiverProps.groupClasses = groupClasses;
        }
        roomEvents.gameManager.inventory = new InventoryReceiver(receiverProps);
    }

    listenInventoryEvents(uiScene, inventoryPanel, equipmentPanel)
    {
        let gameManager = uiScene.gameManager;
        let masterKey = gameManager.inventory.manager.getOwnerEventKey();
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.ADD_ITEM,
            (inventory, item) => {
                let output = this.createItemBox(item, 'inventoryItem', gameManager, uiScene);
                gameManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
                this.setupButtonsActions(inventoryPanel, item.getInventoryId(), item, uiScene);
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('addItemPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.SET_ITEMS,
            (props) => {
                inventoryPanel.innerHTML = '';
                for(let i of Object.keys(props.items)){
                    let item = props.items[i];
                    this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, i);
                }
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('setItemsPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.MODIFY_ITEM_QTY,
            (item) => {
                let qtyBox = uiScene.getUiElement('inventory').getChildByID('item-qty-'+item.getInventoryId());
                qtyBox.innerHTML = item.qty;
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('modifyItemQtyPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.REMOVE_ITEM,
            (inventory, itemKey) => {
                uiScene.getUiElement('inventory').getChildByID('item-'+itemKey).remove();
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('removeItemPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.SET_GROUPS,
            (props) => {
                // @TODO - BETA - If groups are re-set or updated we will need to update the items as well.
                let reEquipItems = false;
                let equipmentItemsGroups = gameManager.gameDom.getElement('#'+InventoryConst.EQUIPMENT_ITEMS);
                if(equipmentItemsGroups.innerHTML !== ''){
                    reEquipItems = true;
                }
                equipmentItemsGroups.innerHTML = '';
                let orderedGroups = this.sortGroups(props.groups);
                for(let i of orderedGroups){
                    let output = this.createGroupBox(props.groups[i], gameManager, uiScene);
                    gameManager.gameDom.appendToElement('#'+InventoryConst.EQUIPMENT_ITEMS, output);
                }
                if(reEquipItems){
                    this.resetEquippedItemsDisplay(gameManager, uiScene, equipmentPanel, inventoryPanel);
                }
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('setGroupsPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.EQUIP_ITEM,
            (item) => {
                this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('equipItemPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.UNEQUIP_ITEM,
            (item) => {
                this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('unequipItemPack'),
            masterKey
        );
    }

    resetEquippedItemsDisplay(gameManager, uiScene, equipmentPanel, inventoryPanel)
    {
        let items = Object.keys(gameManager.inventory.manager.items);
        if(0 === items.length){
            return false;
        }
        for(let i of items){
            let item = gameManager.inventory.manager.items[i];
            if(!this.isEquipped(item)){
                continue;
            }
            this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
        }
    }

    displayItem(item, uiScene, equipmentPanel, inventoryPanel, itemIdx)
    {
        let output = this.createItemBox(item, 'inventoryItem', uiScene.gameManager, uiScene);
        let existentElement = uiScene.gameManager.gameDom.getElement('#item-'+item.getInventoryId());
        if(existentElement){
            existentElement.remove();
        }
        if(!this.isEquipped(item)){
            uiScene.gameManager.gameDom.appendToElement('#' + InventoryConst.INVENTORY_ITEMS, output);
            this.setupButtonsActions(inventoryPanel, itemIdx, item, uiScene);
            return;
        }
        this.displayItemInGroups(item, uiScene, output);
        if(!equipmentPanel){
            return;
        }
        this.setupButtonsActions(equipmentPanel, itemIdx, item, uiScene);
    }

    displayItemInGroups(item, uiScene, output)
    {
        let group = this.getGroupById(item.group_id, uiScene.gameManager.inventory.manager.groups);
        if(group && uiScene.gameManager.gameDom.getElement('#group-item-' + group.key + ' .equipped-item')){
            uiScene.gameManager.gameDom.updateContent('#group-item-' + group.key + ' .equipped-item', output);
            return;
        }
        // @TODO - BETA - Make this append optional for now we will leave it to make the equipment action
        //   visible.
        // Logger.error('Group element not found. Group ID: '+item.group_id);
        uiScene.gameManager.gameDom.appendToElement('#' + InventoryConst.EQUIPMENT_ITEMS, output);
    }

    updateEquipmentStatus(item, gameManager)
    {
        let currentItemElement = gameManager.gameDom.getElement('#item-equip-'+item.idx);
        let equipState = item.equipped ? 'equipped' : 'unequipped';
        // @TODO - BETA - Replace fixed image type.
        currentItemElement.src = '/assets/features/inventory/assets/'+ equipState+GameConst.FILES.EXTENSIONS.PNG;
    }

    createItemBox(item, templateKey, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get(templateKey);
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            label: item.label,
            description: item.description,
            id: item.getInventoryId(),
            qty: item.qty,
            usable: this.isUsable(item) ? this.getUsableContent(item, gameManager, uiScene) : '',
            equipment: this.isEquipment(item) ? this.getEquipContent(item, gameManager, uiScene) : ''
        });
    }

    isEquipment(item)
    {
        return item.isType(ItemsConst.TYPES.EQUIPMENT) || item.isType(ItemsConst.TYPES.SINGLE_EQUIPMENT);
    }

    isEquipped(item)
    {
        return this.isEquipment(item) && true === item.equipped;
    }

    isUsable(item)
    {
        return item.isType(ItemsConst.TYPES.USABLE) || item.isType(ItemsConst.TYPES.SINGLE_USABLE);
    }

    sortGroups(groups)
    {
        return Object.keys(groups).sort((a,b) => {
            return (groups[a].sort > groups[b].sort) ? 1 : -1;
        });
    }

    createGroupBox(group, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('inventoryGroup');
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: group.key,
            label: group.label,
            description: group.description,
            fileName: group.files_name
        });
    }

    setupButtonsActions(inventoryPanel, idx, item, preloadScene)
    {
        // @TODO - BETA - Improve and move all the styles into an external class, and make it configurable.
        let domMan = preloadScene.gameManager.gameDom;
        // show item data:
        let itemImage = inventoryPanel.querySelector('#item-' + idx + ' .image-container img');
        if(!itemImage){
            Logger.error(['Missing image element.', '#item-' + idx]);
            return false;
        }
        itemImage.addEventListener('click', () => {
            let details = inventoryPanel.querySelector('#item-' + idx + ' .item-data-container');
            let show = false;
            if(details.style.display !== 'block'){
                show = true;
            }
            inventoryPanel.querySelectorAll('.item-box .image-container img').forEach(function(element){
                element.style.border = 'none';
            });
            inventoryPanel.querySelectorAll('.item-data-container').forEach(function(element){
                element.style.display = 'none';
            });
            if(show){
                itemImage.style.border = '1px solid #fff';
                details.style.display = 'block';
            }
        });
        let buttonElement = inventoryPanel.querySelector('#item-trash-' + idx + ' img');
        if(!buttonElement){
            Logger.error(['Missing button.', buttonElement]);
            return false;
        }
        buttonElement.addEventListener('click', () => {
            inventoryPanel.querySelector('#trash-confirm-' + idx).style.display = 'block';
        });
        inventoryPanel.querySelector('#trash-cancel-' + idx).addEventListener('click', () => {
            inventoryPanel.querySelector('#trash-confirm-' + idx).style.display = 'none';
        });
        inventoryPanel.querySelector('#trash-confirmed-' + idx).addEventListener('click', () => {
            let optionSend = {
                idx: idx,
                act: InventoryConst.ACTIONS.REMOVE
            };
            preloadScene.gameManager.activeRoomEvents.send(optionSend);
        });
        if(this.isUsable(item)){
            let useBtn = domMan.getElement('#item-use-'+idx);
            useBtn.addEventListener(
                'click',
                this.clickedBox.bind(this, idx, InventoryConst.ACTIONS.USE, preloadScene)
            );
        }
        if(this.isEquipment(item)){
            let equipBtn = domMan.getElement('#item-equip-'+idx);
            equipBtn.addEventListener(
                'click',
                this.clickedBox.bind(this, idx, InventoryConst.ACTIONS.EQUIP, preloadScene)
            );
        }
    }

    clickedBox(itemId, action, preloadScene)
    {
        preloadScene.gameManager.activeRoomEvents.send({act: action, idx: itemId});
    }

    getUsableContent(item, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('inventoryItemUse');
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            id: item.getInventoryId()
        });
    }

    getEquipContent(item, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('inventoryItemEquip');
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            id: item.getInventoryId(),
            equipStatus: item.equipped ? 'equipped' : 'unequipped'
        });
    }

    getGroupById(groupId, groupsList)
    {
        let groups = Object.keys(groupsList);
        if(0 === groups.length){
            return false;
        }
        for(let i of groups){
            if(groupsList[i].id === groupId){
                return groupsList[i];
            }
        }
    }

}

module.exports.InventoryPlugin = InventoryPlugin;
