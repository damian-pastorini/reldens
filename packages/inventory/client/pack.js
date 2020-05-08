/**
 *
 * Reldens - Inventory Client Package
 *
 */

const { Receiver, ItemsEvents } = require('@reldens/items-system');
const { EventsManager, Logger } = require('@reldens/utils');
const { InventoryUi } = require('./inventory-ui');
const { InventoryConst } = require('../constants');

class InventoryPack
{

    constructor()
    {
        // then we can use the event manager to append the feature in every action required:
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            if(key === roomEvents.room.sessionId){
                if(!roomEvents.gameManager.inventory){
                    // create inventory instance only once:
                    let receiverProps = {owner: player};
                    let inventoryClasses = roomEvents.gameManager.config.customClasses.inventory;
                    if(inventoryClasses){
                        receiverProps.itemClasses = inventoryClasses;
                    }
                    // create inventory instance:
                    roomEvents.gameManager.inventory = new Receiver(receiverProps);
                }
                // listen to room messages:
                roomEvents.room.onMessage((message) => {
                    roomEvents.gameManager.inventory.processMessage(message);
                });
            }
        });
        EventsManager.on('reldens.preloadUiScene', (preloadScene) => {
            preloadScene.load.html('uiInventory', 'assets/features/inventory/templates/ui-inventory.html');
            preloadScene.load.html('uiInventoryItem', 'assets/features/inventory/templates/item.html');
        });
        EventsManager.on('reldens.createUiScene', (preloadScene) => {
            this.uiCreate = new InventoryUi(preloadScene);
            this.uiCreate.createUi();
            let inventoryPanel = preloadScene.uiInventory.getChildByProperty('id', InventoryConst.INVENTORY_ITEMS);
            if(!inventoryPanel){
                Logger.error('Inventory UI not found.', inventoryPanel);
                return false;
            }
            let manager = preloadScene.gameManager.inventory.manager;
            if(Object.keys(manager.items).length){
                for(let idx in manager.items){
                    let item = manager.items[idx];
                    let output = this.createItemBox(item, preloadScene.gameManager, preloadScene);
                    // inventoryPanel.innerHTML += output;
                    preloadScene.gameManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
                    this.setupButtonsActions(inventoryPanel, idx, item, preloadScene);
                }
            }
            // listen for inventory events:
            this.listenInventoryEvents(preloadScene, inventoryPanel);
        });
    }

    listenInventoryEvents(uiScene, inventoryPanel)
    {
        let gameManager = uiScene.gameManager;
        gameManager.inventory.manager.events.on(ItemsEvents.ADD_ITEM, (inventory, item) => {
            let output = this.createItemBox(item, gameManager, uiScene);
            // inventoryPanel.innerHTML += output;
            gameManager.gameDom.appendToElement('#'+InventoryConst.INVENTORY_ITEMS, output);
            this.setupButtonsActions(inventoryPanel, item.getInventoryId(), item, uiScene, false);
        });
        // eslint-disable-next-line no-unused-vars
        gameManager.inventory.manager.events.on(ItemsEvents.MODIFY_ITEM_QTY, (item, inventory, op, key, qty) => {
            let qtyBox = uiScene.uiInventory.getChildByID('item-qty-'+item.getInventoryId());
            qtyBox.innerHTML = item.qty;
        });
        gameManager.inventory.manager.events.on(ItemsEvents.REMOVE_ITEM, (inventory, itemKey) => {
            uiScene.uiInventory.getChildByID('item-'+itemKey).remove();
        });
    }

    createItemBox(item, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('uiInventoryItem');
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            label: item.label,
            description: item.description,
            id: item.getInventoryId(),
            qty: item.qty
        });
    }

    // @TODO: improve and move all the styles into an external class, and make it configurable.
    setupButtonsActions(inventoryPanel, idx, item, preloadScene)
    {
        // show item data:
        let itemImage = inventoryPanel.querySelector('#item-' + idx + ' .image-container img');
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
        if(buttonElement){
            // eslint-disable-next-line no-unused-vars
            buttonElement.addEventListener('click', () => {
                inventoryPanel.querySelector('#trash-confirm-' + idx).style.display = 'block';
            });
            inventoryPanel.querySelector('#trash-cancel-' + idx).addEventListener('click', () => {
                inventoryPanel.querySelector('#trash-confirm-' + idx).style.display = 'none';
            });
            inventoryPanel.querySelector('#trash-confirmed-' + idx).addEventListener('click', () => {
                let optionSend = {
                    idx: item.getInventoryId(),
                    act: InventoryConst.INVENTORY_ACTION_REMOVE
                };
                preloadScene.gameManager.room.send(optionSend);
            });
        }
        // show if item is usable or equipable:

        // end.
    }

}

module.exports.InventoryPack = InventoryPack;
