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
        // @TODO - Refactor plugin, extract all the methods into new classes.
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
        this.events.on('reldens.preloadUiScene', (uiSceneManager) => {
            this.preloadTemplates(uiSceneManager);
        });
        this.events.on('reldens.createUiScene', (uiSceneManager) => {
            return this.onCreateUiScene(uiSceneManager);
        });
    }

    preloadTemplates(uiSceneManager)
    {
        // @TODO - BETA - Replace by loader replacing snake name file name by camel case for the template key.
        let inventoryTemplatePath = 'assets/features/inventory/templates/';
        // @TODO - BETA - Move the preload HTML as part of the engine driver.
        uiSceneManager.uiSceneDriver.loadHTML('inventory', inventoryTemplatePath+'ui-inventory.html');
        uiSceneManager.uiSceneDriver.loadHTML('equipment', inventoryTemplatePath+'ui-equipment.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryItem', inventoryTemplatePath+'item.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryItemUse', inventoryTemplatePath+'usable.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryItemEquip', inventoryTemplatePath+'equip.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryGroup', inventoryTemplatePath+'group.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryTradeContainer', inventoryTemplatePath+'trade-container.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryTradeRequirements', inventoryTemplatePath+'trade-requirements.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryTradeRewards', inventoryTemplatePath+'trade-rewards.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryTradeAction', inventoryTemplatePath+'trade-action.html');
        uiSceneManager.uiSceneDriver.loadHTML('inventoryTradeItem', inventoryTemplatePath+'trade-item.html');
    }

    onCreateUiScene(uiSceneManager)
    {
        this.uiManager = new InventoryUi(uiSceneManager);
        this.uiManager.createUi();
        let inventoryPanel = uiSceneManager.uiSceneDriver.getUiElement('inventory')
            .getChildByProperty('id', InventoryConst.INVENTORY_ITEMS);
        let equipmentPanel = uiSceneManager.uiSceneDriver.getUiElement('equipment')
            .getChildByProperty('id', InventoryConst.EQUIPMENT_ITEMS);
        if(!inventoryPanel || !equipmentPanel){
            Logger.error(['Inventory/Equipment UI not found.', inventoryPanel, equipmentPanel]);
            return false;
        }
        let manager = uiSceneManager.getInventoryCallback().manager;
        // first time load, then we listen the events to get the updates:
        if(Object.keys(manager.groups).length){
            uiSceneManager.gameDom.getElement('#' + InventoryConst.EQUIPMENT_ITEMS).innerHTML = '';
            let orderedGroups = this.sortGroups(manager.groups);
            for(let i of orderedGroups){
                let output = this.createGroupBox(manager.groups[i], uiSceneManager);
                uiSceneManager.gameDom.appendToElement('#' + InventoryConst.EQUIPMENT_ITEMS, output);
            }
        }
        let itemsKeys = Object.keys(manager.items);
        if(0 < itemsKeys.length){
            for(let i of itemsKeys){
                let item = manager.items[i];
                this.displayItem(item, uiSceneManager, equipmentPanel, inventoryPanel, i);
            }
        }
        // listen for inventory events:
        this.listenInventoryEvents(uiSceneManager, inventoryPanel, equipmentPanel);
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

    listenInventoryEvents(uiSceneManager, inventoryPanel, equipmentPanel)
    {
        let inventoryManager = uiSceneManager.getInventoryCallback().manager;
        let masterKey = 'p'+inventoryManager.getOwnerId();

        inventoryManager.listenEvent(ItemsEvents.ADD_ITEM, (inventory, item) => {
            let output = this.createItemBox(item, 'inventoryItem', uiSceneManager);
            uiSceneManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
            this.setupButtonsActions(inventoryPanel, item.getInventoryId(), item, uiSceneManager);
        }, 'addItemPack', masterKey);

        inventoryManager.listenEvent(ItemsEvents.SET_ITEMS, (props) => {
            inventoryPanel.innerHTML = '';
            for(let i of Object.keys(props.items)){
                let item = props.items[i];
                this.displayItem(item, uiSceneManager, equipmentPanel, inventoryPanel, i);
            }
        }, 'setItemsPack', masterKey);

        inventoryManager.listenEvent(ItemsEvents.MODIFY_ITEM_QTY, (item, _, __, ___, ____) => {
            let qtyBox = uiSceneManager.getUiElement('inventory').getChildByID('item-qty-'+item.getInventoryId());
            qtyBox.innerHTML = item.qty;
        }, 'modifyItemQtyPack', masterKey);

        inventoryManager.listenEvent(ItemsEvents.REMOVE_ITEM, (inventory, itemKey) => {
            uiSceneManager.getUiElement('inventory').getChildByID('item-'+itemKey).remove();
        }, 'removeItemPack', masterKey);

        inventoryManager.listenEvent(ItemsEvents.SET_GROUPS, (props) => {
            // @TODO - BETA - If groups are re-set or updated we will need to update the items as well.
            let reEquipItems = false;
            let equipmentItemsGroups = uiSceneManager.gameDom.getElement('#'+InventoryConst.EQUIPMENT_ITEMS);
            if(equipmentItemsGroups.innerHTML !== ''){
                reEquipItems = true;
            }
            equipmentItemsGroups.innerHTML = '';
            let orderedGroups = this.sortGroups(props.groups);
            for(let i of orderedGroups){
                let output = this.createGroupBox(props.groups[i], uiSceneManager);
                uiSceneManager.gameDom.appendToElement('#'+InventoryConst.EQUIPMENT_ITEMS, output);
            }
            if(reEquipItems){
                this.resetEquippedItemsDisplay(uiSceneManager, equipmentPanel, inventoryPanel);
            }
        }, 'setGroupsPack', masterKey);

        inventoryManager.listenEvent(ItemsEvents.EQUIP_ITEM, (item) => {
            this.displayItem(item, uiSceneManager, equipmentPanel, inventoryPanel, item.getInventoryId());
        }, 'equipItemPack', masterKey);
        inventoryManager.listenEvent(ItemsEvents.UNEQUIP_ITEM, (item) => {
            this.displayItem(item, uiSceneManager, equipmentPanel, inventoryPanel, item.getInventoryId());
        }, 'unequipItemPack', masterKey);
    }

    resetEquippedItemsDisplay(uiSceneManager, equipmentPanel, inventoryPanel)
    {
        let items = Object.keys(uiSceneManager.getInventoryCallback().manager.items);
        if(0 === items.length){
            return false;
        }
        for(let i of items){
            let item = uiSceneManager.getInventoryCallback().manager.items[i];
            if(!this.isEquipped(item)){
                continue;
            }
            this.displayItem(item, uiSceneManager, equipmentPanel, inventoryPanel, item.getInventoryId());
        }
    }

    displayItem(item, uiSceneManager, equipmentPanel, inventoryPanel, itemIdx)
    {
        let output = this.createItemBox(item, 'inventoryItem', uiSceneManager);
        let existentElement = uiSceneManager.gameDom.getElement('#item-'+item.getInventoryId());
        if(existentElement){
            existentElement.remove();
        }
        if(this.isEquipped(item)){
            let group = this.getGroupById(item.group_id, uiSceneManager.getInventoryCallback().manager.groups);
            if(group && uiSceneManager.gameDom.getElement('#group-item-'+group.key+' .equipped-item')){
                uiSceneManager.gameDom.updateContent('#group-item-'+group.key+' .equipped-item', output);
            } else {
                // @TODO - BETA - Make this append optional for now we will leave it to make the equipment action
                //   visible.
                // Logger.error('Group element not found. Group ID: '+item.group_id);
                uiSceneManager.gameDom.appendToElement('#'+InventoryConst.EQUIPMENT_ITEMS, output);
            }
            this.setupButtonsActions(equipmentPanel, itemIdx, item, uiSceneManager);
        } else {
            uiSceneManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
            this.setupButtonsActions(inventoryPanel, itemIdx, item, uiSceneManager);
        }
    }

    updateEquipmentStatus(item, gameManager)
    {
        let currentItemElement = gameManager.gameDom.getElement('#item-equip-'+item.idx);
        let equipState = item.equipped ? 'equipped' : 'unequipped';
        // @TODO - BETA - Replace fixed image type.
        currentItemElement.src = '/assets/features/inventory/assets/'+ equipState+'.png';
    }

    createItemBox(item, templateKey, uiSceneManager)
    {
        let messageTemplate = uiSceneManager.uiSceneDriver.getCacheHtml(templateKey);
        return uiSceneManager.parseTemplateCallback(messageTemplate, {
            key: item.key,
            label: item.label,
            description: item.description,
            id: item.getInventoryId(),
            qty: item.qty,
            usable: this.isUsable(item) ? this.getUsableContent(item, uiSceneManager) : '',
            equipment: this.isEquipment(item) ? this.getEquipContent(item, uiSceneManager) : ''
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

    createGroupBox(group, uiSceneManager)
    {
        let messageTemplate = uiSceneManager.uiSceneDriver.getCacheHtml('inventoryGroup');
        return uiSceneManager.parseTemplateCallback(messageTemplate, {
            key: group.key,
            label: group.label,
            description: group.description,
            fileName: group.files_name
        });
    }

    setupButtonsActions(inventoryPanel, idx, item, uiSceneManager)
    {
        // @TODO - BETA - Improve and move all the styles into an external class, and make it configurable.
        // shortcuts:
        let domMan = uiSceneManager.gameDom;
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
            uiSceneManager.getActiveRoomEventsCallback().room.send('*', optionSend);
        });
        // use:
        if(this.isUsable(item)){
            let useBtn = domMan.getElement('#item-use-'+idx);
            useBtn.addEventListener('click', this.clickedBox.bind(this, idx, InventoryConst.ACTION_USE, uiSceneManager));
        }
        // equip / unequip:
        if(this.isEquipment(item)){
            let equipBtn = domMan.getElement('#item-equip-'+idx);
            equipBtn.addEventListener('click', this.clickedBox.bind(this, idx, InventoryConst.ACTION_EQUIP, uiSceneManager));
        }
    }

    clickedBox(itemId, action, uiSceneManager)
    {
        uiSceneManager.getActiveRoomEventsCallback().room.send('*', {act: action, idx: itemId});
    }

    getUsableContent(item, uiSceneManager)
    {
        let messageTemplate = uiSceneManager.uiSceneDriver.getCacheHtml('inventoryItemUse');
        return uiSceneManager.parseTemplateCallback(messageTemplate, {
            id: item.getInventoryId()
        });
    }

    getEquipContent(item, uiSceneManager)
    {
        let messageTemplate = uiSceneManager.uiSceneDriver.getCacheHtml('inventoryItemEquip');
        return uiSceneManager.parseTemplateCallback(messageTemplate, {
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
