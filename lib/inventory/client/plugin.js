/**
 *
 * Reldens - Inventory Client Plugin
 *
 */

const { ItemsEvents, ItemsConst } = require('@reldens/items-system');
const { InventoryUi } = require('./inventory-ui');
const { InventoryReceiver } = require('./inventory-receiver');
const { InventoryConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class InventoryPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            this.onPlayerAdd(key, roomEvents, player);
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            this.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            return this.onPreloadUiScene(preloadScene);
        });
    }

    preloadTemplates(preloadScene)
    {
        // @TODO - BETA - replace by loader replacing snake name file name by camel case for the template key.
        preloadScene.load.html('inventory', 'assets/features/inventory/templates/ui-inventory.html');
        preloadScene.load.html('equipment', 'assets/features/inventory/templates/ui-equipment.html');
        preloadScene.load.html('inventoryItem', 'assets/features/inventory/templates/item.html');
        preloadScene.load.html('inventoryItemUse', 'assets/features/inventory/templates/usable.html');
        preloadScene.load.html('inventoryItemEquip', 'assets/features/inventory/templates/equip.html');
        preloadScene.load.html('inventoryGroup', 'assets/features/inventory/templates/group.html');
    }

    onPreloadUiScene(preloadScene)
    {
        this.uiManager = new InventoryUi(preloadScene);
        this.uiManager.createUi();
        let inventoryPanel = preloadScene.getUiElement('inventory')
            .getChildByProperty('id', InventoryConst.INVENTORY_ITEMS);
        let equipmentPanel = preloadScene.getUiElement('equipment')
            .getChildByProperty('id', InventoryConst.EQUIPMENT_ITEMS);
        if(!inventoryPanel || !equipmentPanel){
            Logger.error(['Inventory/Equipment UI not found.', inventoryPanel, equipmentPanel]);
            return false;
        }
        let manager = preloadScene.gameManager.inventory.manager;
        // first time load, then we listen the events to get the updates:
        if(Object.keys(manager.groups).length){
            preloadScene.gameManager.gameDom.getElement('#' + InventoryConst.EQUIPMENT_ITEMS).innerHTML = '';
            let orderedGroups = this.sortGroups(manager.groups);
            for(let i of orderedGroups){
                let output = this.createGroupBox(manager.groups[i], preloadScene.gameManager, preloadScene);
                preloadScene.gameManager.gameDom.appendToElement('#' + InventoryConst.EQUIPMENT_ITEMS, output);
            }
        }
        if(Object.keys(manager.items).length){
            for(let i of Object.keys(manager.items)){
                let item = manager.items[i];
                this.displayItem(item, preloadScene, equipmentPanel, inventoryPanel, i);
            }
        }
        // listen for inventory events:
        this.listenInventoryEvents(preloadScene, inventoryPanel, equipmentPanel);
    }

    onPlayerAdd(key, roomEvents, player)
    {
        if(key !== roomEvents.room.sessionId){
            return false;
        }
        if(!roomEvents.gameManager.inventory){
            this.createInventoryInstance(player, roomEvents);
        }
        // listen to room messages:
        roomEvents.room.onMessage('game-message', (message) => {
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
        let inventoryClasses = roomEvents.gameManager.config.get('client/customClasses/inventory/items', true) || {};
        if(inventoryClasses && 0 < Object.keys(inventoryClasses).length){
            receiverProps.itemClasses = inventoryClasses;
        }
        let groupClasses = roomEvents.gameManager.config.get('client/customClasses/inventory/groups', true) || {};
        if(groupClasses && Object.keys(groupClasses).length){
            receiverProps.groupClasses = groupClasses;
        }
        roomEvents.gameManager.inventory = new InventoryReceiver(receiverProps);
    }

    listenInventoryEvents(uiScene, inventoryPanel, equipmentPanel)
    {
        let gameManager = uiScene.gameManager;
        let masterKey = 'p'+gameManager.inventory.manager.getOwnerId();
        gameManager.inventory.manager.listenEvent(ItemsEvents.ADD_ITEM, (inventory, item) => {
            let output = this.createItemBox(item, gameManager, uiScene);
            gameManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
            this.setupButtonsActions(inventoryPanel, item.getInventoryId(), item, uiScene);
        }, 'addItemPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.SET_ITEMS, (props) => {
            inventoryPanel.innerHTML = '';
            for(let i of Object.keys(props.items)){
                let item = props.items[i];
                this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, i);
            }
        }, 'setItemsPack', masterKey);
        // eslint-disable-next-line no-unused-vars
        gameManager.inventory.manager.listenEvent(ItemsEvents.MODIFY_ITEM_QTY, (item, inventory, op, key, qty) => {
            let qtyBox = uiScene.getUiElement('inventory').getChildByID('item-qty-'+item.getInventoryId());
            qtyBox.innerHTML = item.qty;
        }, 'modifyItemQtyPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.REMOVE_ITEM, (inventory, itemKey) => {
            uiScene.getUiElement('inventory').getChildByID('item-'+itemKey).remove();
        }, 'removeItemPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.SET_GROUPS, (props) => {
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
        }, 'setGroupsPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.EQUIP_ITEM, (item) => {
            this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
        }, 'equipItemPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.UNEQUIP_ITEM, (item) => {
            this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
        }, 'unequipItemPack', masterKey);
    }

    resetEquippedItemsDisplay(gameManager, uiScene, equipmentPanel, inventoryPanel)
    {
        let items = Object.keys(gameManager.inventory.manager.items);
        if(0 === items.length){
            return false;
        }
        for(let i of items){
            let item = gameManager.inventory.manager.items[i];
            if(this.isEquipped(item)){
                this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
            }
        }
    }

    displayItem(item, uiScene, equipmentPanel, inventoryPanel, itemIdx)
    {
        let output = this.createItemBox(item, uiScene.gameManager, uiScene);
        let existentElement = uiScene.gameManager.gameDom.getElement('#item-'+item.getInventoryId());
        if(existentElement){
            existentElement.remove();
        }
        if(this.isEquipped(item)){
            let group = this.getGroupById(item.group_id, uiScene.gameManager.inventory.manager.groups);
            if(group && uiScene.gameManager.gameDom.getElement('#group-item-'+group.key+' .equipped-item')){
                uiScene.gameManager.gameDom.updateContent('#group-item-'+group.key+' .equipped-item', output);
            } else {
                // @TODO - BETA - Make this append optional for now we will leave it to make the equipment action
                //   visible.
                // Logger.error('Group element not found. Group ID: '+item.group_id);
                uiScene.gameManager.gameDom.appendToElement('#'+InventoryConst.EQUIPMENT_ITEMS, output);
            }
            this.setupButtonsActions(equipmentPanel, itemIdx, item, uiScene);
        } else {
            uiScene.gameManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
            this.setupButtonsActions(inventoryPanel, itemIdx, item, uiScene);
        }
    }

    updateEquipmentStatus(item, gameManager)
    {
        let currentItemElement = gameManager.gameDom.getElement('#item-equip-'+item.idx);
        let equipState = item.equipped ? 'equipped' : 'unequipped';
        // @TODO - BETA - Replace fixed image type.
        currentItemElement.src = '/assets/features/inventory/assets/'+ equipState+'.png';
    }

    createItemBox(item, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('inventoryItem');
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
        // shortcuts:
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
        // show item trash:
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
                act: InventoryConst.ACTION_REMOVE
            };
            preloadScene.gameManager.room.send('game-message', optionSend);
        });
        // use:
        if(this.isUsable(item)){
            let useBtn = domMan.getElement('#item-use-'+idx);
            useBtn.addEventListener('click', this.clickedBox.bind(this, idx, InventoryConst.ACTION_USE, preloadScene));
        }
        // equip / unequip:
        if(this.isEquipment(item)){
            let equipBtn = domMan.getElement('#item-equip-'+idx);
            equipBtn.addEventListener('click', this.clickedBox.bind(this, idx, InventoryConst.ACTION_EQUIP, preloadScene));
        }
    }

    clickedBox(itemId, action, preloadScene)
    {
        preloadScene.gameManager.room.send('game-message', {act: action, idx: itemId});
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
        let result = false;
        let groups = Object.keys(groupsList);
        if(groups.length){
            for(let i of groups){
                let group = groupsList[i];
                if(group.id === groupId){
                    result = group;
                    break;
                }
            }
        }
        return result;
    }

}

module.exports.InventoryPlugin = InventoryPlugin;
