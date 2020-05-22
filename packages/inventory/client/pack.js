/**
 *
 * Reldens - Inventory Client Package
 *
 */

const { Receiver, ItemsEvents, ItemsConst } = require('@reldens/items-system');
const { EventsManager, Logger } = require('@reldens/utils');
const { InventoryUi } = require('./inventory-ui');
const { InventoryConst } = require('../constants');

class InventoryPack
{

    constructor()
    {
        this.itemSprites = {};
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
                    roomEvents.gameManager.inventory.onExecuting = (message) => {
                        this.executingItem(message, roomEvents.gameManager);
                    };
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
            preloadScene.load.html('uiInventoryItemUse', 'assets/features/inventory/templates/usable.html');
            preloadScene.load.html('uiInventoryItemEquip', 'assets/features/inventory/templates/equip.html');
        });
        EventsManager.on('reldens.createUiScene', (preloadScene) => {
            this.uiCreate = new InventoryUi(preloadScene);
            this.uiCreate.createUi();
            let inventoryPanel = preloadScene.uiInventory.getChildByProperty('id', InventoryConst.ITEMS);
            if(!inventoryPanel){
                Logger.error('Inventory UI not found.', inventoryPanel);
                return false;
            }
            let manager = preloadScene.gameManager.inventory.manager;
            if(Object.keys(manager.items).length){
                for(let i of Object.keys(manager.items)){
                    let item = manager.items[i];
                    let output = this.createItemBox(item, preloadScene.gameManager, preloadScene);
                    preloadScene.gameManager.gameDom.appendToElement('#'+InventoryConst.ITEMS, output);
                    this.setupButtonsActions(inventoryPanel, i, item, preloadScene);
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
            gameManager.gameDom.appendToElement('#'+InventoryConst.ITEMS, output);
            this.setupButtonsActions(inventoryPanel, item.getInventoryId(), item, uiScene);
        });
        gameManager.inventory.manager.events.on(ItemsEvents.SET_ITEMS, (props) => {
            inventoryPanel.innerHTML = '';
            for(let i of Object.keys(props.items)){
                let item = props.items[i];
                let output = this.createItemBox(item, gameManager, uiScene);
                gameManager.gameDom.appendToElement('#'+InventoryConst.ITEMS, output);
                this.setupButtonsActions(inventoryPanel, item.getInventoryId(), item, uiScene);
            }
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
            qty: item.qty,
            usable: (item.type === ItemsConst.TYPE_USABLE) ? this.getUsableContent(item, gameManager, uiScene) : '',
            equipment: (item.type === ItemsConst.TYPE_EQUIPMENT) ? this.getEquipmentContent(item, gameManager, uiScene) : ''
        });
    }

    // @TODO: improve and move all the styles into an external class, and make it configurable.
    setupButtonsActions(inventoryPanel, idx, item, preloadScene)
    {
        // shortcuts:
        let domMan = preloadScene.gameManager.gameDom;
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
                preloadScene.gameManager.room.send(optionSend);
            });
        }
        // use:
        if(item.type === ItemsConst.TYPE_USABLE){
            let useBtn = domMan.getElement('#item-use-'+idx);
            useBtn.on('click', this.clickedBox.bind(this, idx, InventoryConst.ACTION_USE, preloadScene));
        }
        // equip / unequip:
        if(item.type === ItemsConst.TYPE_EQUIPMENT){
            let equipBtn = domMan.getElement('#item-equip-'+idx);
            equipBtn.on('click', this.clickedBox.bind(this, idx, InventoryConst.ACTION_EQUIP, preloadScene));
        }
    }

    clickedBox(itemId, action, preloadScene)
    {
        preloadScene.gameManager.room.send({act: action, idx: itemId});
    }

    getUsableContent(item, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('uiInventoryItemUse');
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            id: item.getInventoryId()
        });
    }

    getEquipmentContent(item, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('uiInventoryItemEquip');
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            id: item.getInventoryId(),
            equipStatus: item.equipped ? 'equipped' : 'unequipped'
        });
    }

    executingItem(message, gameManager)
    {
        // @TODO: improve, split in several classes, methods and functionalities.
        let item = message.item;
        if(!{}.hasOwnProperty.call(item, 'animationData')){
            return false;
        }
        let animKey = 'aK_'+item.key;
        let currentScene = gameManager.getActiveScene();
        currentScene.load.spritesheet(animKey, 'assets/custom/sprites/'+item.key+'.png', {
            frameWidth: item.animationData.frameWidth || 64,
            frameHeight: item.animationData.frameHeight || 64
        });
        currentScene.load.on('complete', () => {
            if({}.hasOwnProperty.call(this.itemSprites, animKey)){
                // sprite already running:
                return false;
            }
            let createData = {
                key: animKey,
                frames: currentScene.anims.generateFrameNumbers(animKey, {
                    start: item.animationData.start || 0,
                    end: item.animationData.end || 1
                }),
                frameRate: {}.hasOwnProperty.call(item.animationData, 'rate') ?
                    item.animationData.rate : currentScene.configuredFrameRate,
                repeat: item.animationData.repeat || 3,
                hideOnComplete: {}.hasOwnProperty.call(item.animationData, 'hide') ?
                    item.animationData.hide : true,
            };
            let x, y = 0;
            let targetId = (item.animationData.startsOnTarget && {}.hasOwnProperty.call(message.target, 'sessionId')) ?
                message.target.sessionId : gameManager.getCurrentPlayer().sessionId;
            let playerSprite = currentScene.player.players[targetId];
            if(item.animationData.usePlayerPosition){
                currentScene.anims.create(createData);
                x = playerSprite.x;
                y = playerSprite.y;
            }
            if({}.hasOwnProperty.call(item.animationData, 'fixedX')){
                x = item.animationData.fixedX;
            }
            if({}.hasOwnProperty.call(item.animationData, 'fixedY')){
                y = item.animationData.fixedY;
            }
            if(item.animationData.closeInventoryOnUse){
                gameManager.gameDom.getElement('#inventory-close').click();
            }
            this.itemSprites[animKey] = currentScene.physics.add.sprite(x, y, animKey);
            this.itemSprites[animKey].setDepth(2000000);
            if(item.animationData.followPlayer){
                playerSprite.moveSprites[animKey] = this.itemSprites[animKey];
            }
            this.itemSprites[animKey].anims.play(animKey, true).on('animationcomplete', () => {
                if(item.animationData.destroyOnComplete){
                    this.itemSprites[animKey].destroy();
                    if(item.animationData.followPlayer){
                        delete this.itemSprites[animKey];
                    }
                }
            });
        });
        currentScene.load.start();
    }

}

module.exports.InventoryPack = InventoryPack;
