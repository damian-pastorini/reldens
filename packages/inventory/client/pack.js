/**
 *
 * Reldens - Inventory Client Package
 *
 */

const { Receiver, ItemsEvents, ItemsConst } = require('@reldens/items-system');
const { EventsManagerSingleton, Logger } = require('@reldens/utils');
const { InventoryUi } = require('./inventory-ui');
const { InventoryConst } = require('../constants');

class InventoryPack
{

    constructor()
    {
        this.itemSprites = {};
        // then we can use the event manager to append the feature in every action required:
        // eslint-disable-next-line no-unused-vars
        EventsManagerSingleton.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            if(key === roomEvents.room.sessionId){
                if(!roomEvents.gameManager.inventory){
                    // create inventory instance only once:
                    let receiverProps = {owner: player, ownerIdProperty: 'sessionId'};
                    let inventoryClasses = roomEvents.gameManager.config.customClasses.inventory.items;
                    if(inventoryClasses){
                        receiverProps.itemClasses = inventoryClasses;
                    }
                    let groupClasses = roomEvents.gameManager.config.customClasses.inventory.groups;
                    if(groupClasses){
                        receiverProps.groupClasses = groupClasses;
                    }
                    // create inventory instance:
                    roomEvents.gameManager.inventory = new Receiver(receiverProps);
                    // @TODO: extend the Receiver class for this override.
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
        EventsManagerSingleton.on('reldens.preloadUiScene', (preloadScene) => {
            preloadScene.load.html('uiInventory', 'assets/features/inventory/templates/ui-inventory.html');
            preloadScene.load.html('uiEquipment', 'assets/features/inventory/templates/ui-equipment.html');
            preloadScene.load.html('uiInventoryItem', 'assets/features/inventory/templates/item.html');
            preloadScene.load.html('uiInventoryItemUse', 'assets/features/inventory/templates/usable.html');
            preloadScene.load.html('uiInventoryItemEquip', 'assets/features/inventory/templates/equip.html');
            preloadScene.load.html('uiInventoryGroup', 'assets/features/inventory/templates/group.html');
        });
        EventsManagerSingleton.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new InventoryUi(preloadScene);
            this.uiManager.createUi();
            let inventoryPanel = preloadScene.uiInventory.getChildByProperty('id', InventoryConst.INVENTORY_ITEMS);
            let equipmentPanel = preloadScene.uiEquipment.getChildByProperty('id', InventoryConst.EQUIPMENT_ITEMS);
            if(!inventoryPanel || !equipmentPanel){
                Logger.error(['Inventory/Equipment UI not found.', inventoryPanel, equipmentPanel]);
                return false;
            }
            let manager = preloadScene.gameManager.inventory.manager;
            // first time load and then we listen the events to get the updates:
            if(Object.keys(manager.groups).length){
                preloadScene.gameManager.gameDom.getElement('#'+InventoryConst.EQUIPMENT_ITEMS).html('');
                let orderedGroups = this.sortGroups(manager.groups);
                for(let i of orderedGroups){
                    let output = this.createGroupBox(manager.groups[i], preloadScene.gameManager, preloadScene);
                    preloadScene.gameManager.gameDom.appendToElement('#'+InventoryConst.EQUIPMENT_ITEMS, output);
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
        });
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
            let qtyBox = uiScene.uiInventory.getChildByID('item-qty-'+item.getInventoryId());
            qtyBox.innerHTML = item.qty;
        }, 'modifyItemQtyPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.REMOVE_ITEM, (inventory, itemKey) => {
            uiScene.uiInventory.getChildByID('item-'+itemKey).remove();
        }, 'removeItemPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.SET_GROUPS, (props) => {
            gameManager.gameDom.getElement('#'+InventoryConst.EQUIPMENT_ITEMS).html('');
            let orderedGroups = this.sortGroups(props.groups);
            for(let i of orderedGroups){
                let output = this.createGroupBox(props.groups[i], gameManager, uiScene);
                gameManager.gameDom.appendToElement('#'+InventoryConst.EQUIPMENT_ITEMS, output);
            }
        }, 'setGroupsPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.EQUIP_ITEM, (item) => {
            this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
        }, 'equipItemPack', masterKey);
        gameManager.inventory.manager.listenEvent(ItemsEvents.UNEQUIP_ITEM, (item) => {
            this.displayItem(item, uiScene, equipmentPanel, inventoryPanel, item.getInventoryId());
        }, 'unequipItemPack', masterKey);
    }

    displayItem(item, uiScene, equipmentPanel, inventoryPanel, itemIdx)
    {
        let output = this.createItemBox(item, uiScene.gameManager, uiScene);
        let existentElement = uiScene.gameManager.gameDom.getElement('#item-'+item.getInventoryId());
        if(existentElement.length){
            existentElement.remove();
        }
        if(item.isType(ItemsConst.TYPE_EQUIPMENT) && item.equipped){
            let group = this.getGroupById(item.group_id, uiScene.gameManager.inventory.manager.groups);
            if(group && uiScene.gameManager.gameDom.getElement('#group-item-'+group.key+' .equipped-item').length){
                uiScene.gameManager.gameDom.updateContent('#group-item-'+group.key+' .equipped-item', output);
            } else {
                // @TODO: make this append optional for now we will leave it to make the equipment action visible.
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
        currentItemElement.src = '/assets/features/inventory/assets/'+(item.equipped ?
            'equipped' : 'unequipped')+'.png';
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
            usable: item.isType(ItemsConst.TYPE_USABLE) ? this.getUsableContent(item, gameManager, uiScene) : '',
            equipment: item.isType(ItemsConst.TYPE_EQUIPMENT) ? this.getEquipContent(item, gameManager, uiScene) : ''
        });
    }

    sortGroups(groups)
    {
        return Object.keys(groups).sort((a,b) => {
            return (groups[a].sort > groups[b].sort) ? 1 : -1;
        });
    }

    createGroupBox(group, gameManager, uiScene)
    {
        let messageTemplate = uiScene.cache.html.get('uiInventoryGroup');
        return gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: group.key,
            label: group.label,
            description: group.description
        });
    }

    // @TODO: improve and move all the styles into an external class, and make it configurable.
    setupButtonsActions(inventoryPanel, idx, item, preloadScene)
    {
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
            preloadScene.gameManager.room.send(optionSend);
        });
        // use:
        if(item.isType(ItemsConst.TYPE_USABLE)){
            let useBtn = domMan.getElement('#item-use-'+idx);
            useBtn.on('click', this.clickedBox.bind(this, idx, InventoryConst.ACTION_USE, preloadScene));
        }
        // equip / unequip:
        if(item.isType(ItemsConst.TYPE_EQUIPMENT)){
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

    getEquipContent(item, gameManager, uiScene)
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
            let x = 0, y = 0;
            let targetId = (
                    item.animationData.startsOnTarget
                    && {}.hasOwnProperty.call(message.target, 'playerId')
                    && message.target.playerId
                ) ? message.target.playerId : currentScene.player.playerId;
            if(!targetId || !{}.hasOwnProperty.call(currentScene.player.players, targetId)){
                Logger.error('Player sprite not found.');
                return false;
            }
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

module.exports.InventoryPack = InventoryPack;
