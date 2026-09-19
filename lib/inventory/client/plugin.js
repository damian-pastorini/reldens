/**
 *
 * Reldens - InventoryPlugin
 *
 * Client-side plugin for the inventory system.
 * Manages UI, event listeners, trade actions, and player inventory instances.
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
const { ItemsEvents } = require('@reldens/items-system');
const { Logger, sc } = require('@reldens/utils');
const { InventoryItemDisplay } = require('./inventory-item-display');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class InventoryPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     */
    async setup(props)
    {
        // @TODO - BETA - Refactor plugin, extract all the methods into new classes.
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        this.itemDisplay = new InventoryItemDisplay();
        this.tradeTargetAction = new TradeTargetAction();
        this.listenEvents();
        if(!this.gameManager){
            return;
        }
        // @TODO - BETA - Make the dialogBox template load on it's own so we can reuse the same object from cache.
        // @NOTE: the tradeUi works as preload for the trade template which at the end is an dialog-box.
        this.tradeUi = new UserInterface(this.gameManager, {id: 'trade', type: 'trade'});
        this.gameManager.config.client.message.listeners['trade'] = new TradeMessageListener();
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, InventoryConst.MESSAGE.DATA_VALUES);
    }

    /**
     * @returns {boolean|void}
     */
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
        return true;
    }

    /**
     * @param {Object} preloadScene
     */
    onPreloadUiScene(preloadScene)
    {
        this.uiManager = new InventoryUi(preloadScene);
        this.uiManager.createUi();
        let manager = preloadScene.gameManager.inventory.manager;
        let equipmentPanel = this.activateGroupAndEquipmentUi(preloadScene, manager);
        let inventoryPanel = this.activateInventoryUi(preloadScene, manager, equipmentPanel);
        this.listenInventoryEvents(preloadScene, inventoryPanel, equipmentPanel);
    }

    /**
     * @param {Object} preloadScene
     * @param {Object} manager
     * @returns {Object|boolean}
     */
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
            this.appendGroupBoxes(
                this.itemDisplay.sortGroups(inventoryGroups),
                inventoryGroups,
                preloadScene.gameManager,
                preloadScene
            );
        }
        return equipmentPanel;
    }

    /**
     * @param {Object} preloadScene
     * @param {Object} manager
     * @param {Object} equipmentPanel
     * @returns {Object|boolean}
     */
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
            for(let i of itemsKeys){
                let item = itemsElements[i];
                this.itemDisplay.displayItem(item, preloadScene, equipmentPanel, inventoryPanel, i);
            }
        }
        return inventoryPanel;
    }

    /**
     * @param {string} key
     * @param {Object} roomEvents
     * @param {Object} player
     * @returns {boolean|void}
     */
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
        return true;
    }

    /**
     * @param {Object} player
     * @param {Object} roomEvents
     */
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

    /**
     * @param {Object} uiScene
     * @param {Object} inventoryPanel
     * @param {Object} equipmentPanel
     */
    listenInventoryEvents(uiScene, inventoryPanel, equipmentPanel)
    {
        let gameManager = uiScene.gameManager;
        let masterKey = gameManager.inventory.manager.getOwnerEventKey();
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.ADD_ITEM,
            (inventory, item) => {
                let output = this.itemDisplay.createItemBox(item, 'inventoryItem', gameManager, uiScene);
                gameManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
                this.itemDisplay.setupButtonsActions(inventoryPanel, item.getInventoryId(), item, uiScene);
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
                    this.itemDisplay.displayItem(item, uiScene, equipmentPanel, inventoryPanel, i);
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
                this.appendGroupBoxes(
                    this.itemDisplay.sortGroups(props.groups),
                    props.groups,
                    gameManager,
                    uiScene
                );
                if(reEquipItems){
                    this.itemDisplay.resetEquippedItemsDisplay(gameManager, uiScene, equipmentPanel, inventoryPanel);
                }
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('setGroupsPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.EQUIP_ITEM,
            (item) => {
                this.itemDisplay.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('equipItemPack'),
            masterKey
        );
        gameManager.inventory.manager.listenEvent(
            ItemsEvents.UNEQUIP_ITEM,
            (item) => {
                this.itemDisplay.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
            },
            gameManager.inventory.manager.getOwnerUniqueEventKey('unequipItemPack'),
            masterKey
        );
    }

    /**
     * @param {Array} orderedGroups
     * @param {Object} groups
     * @param {GameManager} gameManager
     * @param {Object} uiScene
     */
    appendGroupBoxes(orderedGroups, groups, gameManager, uiScene)
    {
        for(let i of orderedGroups){
            let output = this.itemDisplay.createGroupBox(groups[i], gameManager, uiScene);
            gameManager.gameDom.appendToElement('#'+InventoryConst.EQUIPMENT_ITEMS, output);
        }
    }

}

module.exports.InventoryPlugin = InventoryPlugin;
