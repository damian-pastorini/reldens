/**
 *
 * Reldens - InventoryItemDisplay
 *
 */

const { ItemsConst } = require('@reldens/items-system');
const { GameConst } = require('../../game/constants');
const { InventoryConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class InventoryItemDisplay
{

    /**
     * @param {Object} item
     * @param {number} typeA
     * @param {number} typeB
     * @returns {boolean}
     */
    isItemOfTypes(item, typeA, typeB)
    {
        return item.isType(typeA) || item.isType(typeB);
    }

    /**
     * @param {InventoryItem} item
     * @returns {boolean}
     */
    isEquipment(item)
    {
        return this.isItemOfTypes(item, ItemsConst.TYPES.EQUIPMENT, ItemsConst.TYPES.SINGLE_EQUIPMENT);
    }

    /**
     * @param {EquipmentItem} item
     * @returns {boolean}
     */
    isEquipped(item)
    {
        return this.isEquipment(item) && true === item.equipped;
    }

    /**
     * @param {Object} item
     * @returns {boolean}
     */
    isUsable(item)
    {
        return this.isItemOfTypes(item, ItemsConst.TYPES.USABLE, ItemsConst.TYPES.SINGLE_USABLE);
    }

    /**
     * @param {Object} groups
     * @returns {Array}
     */
    sortGroups(groups)
    {
        return Object.keys(groups).sort((a,b) => {
            return (groups[a].sort > groups[b].sort) ? 1 : -1;
        });
    }

    /**
     * @param {Object} item
     * @param {string} templateKey
     * @param {GameManager} gameManager
     * @param {Object} uiScene
     * @returns {string}
     */
    createItemBox(item, templateKey, gameManager, uiScene)
    {
        return gameManager.gameEngine.parseTemplate(uiScene.cache.html.get(templateKey), {
            key: item.key,
            label: item.label,
            description: item.description,
            id: item.getInventoryId(),
            qty: item.qty,
            usable: this.isUsable(item) ? this.getUsableContent(item, gameManager, uiScene) : '',
            equipment: this.isEquipment(item) ? this.getEquipContent(item, gameManager, uiScene) : ''
        });
    }

    /**
     * @param {Object} group
     * @param {GameManager} gameManager
     * @param {Object} uiScene
     * @returns {string}
     */
    createGroupBox(group, gameManager, uiScene)
    {
        return gameManager.gameEngine.parseTemplate(uiScene.cache.html.get('inventoryGroup'), {
            key: group.key,
            label: group.label,
            description: group.description,
            fileName: group.files_name
        });
    }

    /**
     * @param {UsableItem} item
     * @param {GameManager} gameManager
     * @param {Object} uiScene
     * @returns {string}
     */
    getUsableContent(item, gameManager, uiScene)
    {
        return gameManager.gameEngine.parseTemplate(uiScene.cache.html.get('inventoryItemUse'), {
            id: item.getInventoryId()
        });
    }

    /**
     * @param {EquipmentItem} item
     * @param {GameManager} gameManager
     * @param {Object} uiScene
     * @returns {string}
     */
    getEquipContent(item, gameManager, uiScene)
    {
        return gameManager.gameEngine.parseTemplate(uiScene.cache.html.get('inventoryItemEquip'), {
            id: item.getInventoryId(),
            equipStatus: item.equipped ? 'equipped' : 'unequipped'
        });
    }

    /**
     * @param {Object} inventoryPanel
     * @param {string} idx
     * @param {Object} item
     * @param {Object} preloadScene
     * @returns {boolean|void}
     */
    setupButtonsActions(inventoryPanel, idx, item, preloadScene)
    {
        // @TODO - BETA - Improve and move all the styles into an external class, and make it configurable.
        let domMan = preloadScene.gameManager.gameDom;
        let itemImage = inventoryPanel.querySelector('#item-' + idx + ' .image-container img');
        if(!itemImage){
            Logger.error(['Missing image element.', '#item-' + idx]);
            return false;
        }
        itemImage.addEventListener('click', () => {
            let details = inventoryPanel.querySelector('#item-' + idx + ' .item-data-container');
            let show = !details.classList.contains('item-data-visible');
            for(let element of inventoryPanel.querySelectorAll('.item-box .image-container img')){
                element.classList.remove('item-selected');
            }
            for(let element of inventoryPanel.querySelectorAll('.item-data-container')){
                element.classList.remove('item-data-visible');
                element.classList.remove('popup-left');
            }
            if(show){
                let itemBox = inventoryPanel.querySelector('#item-' + idx);
                let containerWidth = inventoryPanel.offsetWidth;
                let popupMinWidth = 120;
                let fitsRight = itemBox.offsetLeft + itemBox.offsetWidth + popupMinWidth <= containerWidth;
                let fitsLeft = itemBox.offsetLeft >= popupMinWidth;
                if(!fitsRight && fitsLeft){
                    details.classList.add('popup-left');
                }
                itemImage.classList.add('item-selected');
                details.classList.add('item-data-visible');
                itemBox.classList.add('item-popup-open');
            }
        });
        let buttonElement = inventoryPanel.querySelector('#item-trash-' + idx + ' img');
        if(!buttonElement){
            Logger.error(['Missing button.', buttonElement]);
            return false;
        }
        buttonElement.addEventListener('click', () => {
            inventoryPanel.querySelector('#trash-confirm-' + idx).classList.add('trash-confirm-visible');
        });
        inventoryPanel.querySelector('#trash-cancel-' + idx).addEventListener('click', () => {
            inventoryPanel.querySelector('#trash-confirm-' + idx).classList.remove('trash-confirm-visible');
        });
        inventoryPanel.querySelector('#trash-confirmed-' + idx).addEventListener('click', () => {
            preloadScene.gameManager.activeRoomEvents.send({
                idx: idx,
                act: InventoryConst.ACTIONS.REMOVE
            });
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
        return true;
    }

    /**
     * @param {string} itemId
     * @param {string} action
     * @param {Object} preloadScene
     */
    clickedBox(itemId, action, preloadScene)
    {
        preloadScene.gameManager.activeRoomEvents.send({act: action, idx: itemId});
    }

    /**
     * @param {Object} item
     * @param {Object} uiScene
     * @param {Object} equipmentPanel
     * @param {Object} inventoryPanel
     * @param {string} itemIdx
     */
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

    /**
     * @param {Object} item
     * @param {Object} uiScene
     * @param {string} output
     */
    displayItemInGroups(item, uiScene, output)
    {
        let group = this.getGroupById(item.group_id, uiScene.gameManager.inventory.manager.groups);
        if(group && uiScene.gameManager.gameDom.getElement('#group-item-' + group.key + ' .equipped-item')){
            uiScene.gameManager.gameDom.updateContent('#group-item-' + group.key + ' .equipped-item', output);
            return;
        }
        uiScene.gameManager.gameDom.appendToElement('#' + InventoryConst.EQUIPMENT_ITEMS, output);
    }

    /**
     * @param {GameManager} gameManager
     * @param {Object} uiScene
     * @param {Object} equipmentPanel
     * @param {Object} inventoryPanel
     * @returns {boolean|void}
     */
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
        return true;
    }

    /**
     * @param {Object} item
     * @param {GameManager} gameManager
     */
    updateEquipmentStatus(item, gameManager)
    {
        let currentItemElement = gameManager.gameDom.getElement('#item-equip-'+item.idx);
        let equipState = item.equipped ? 'equipped' : 'unequipped';
        // @TODO - BETA - Replace fixed image type.
        currentItemElement.src = '/assets/features/inventory/assets/'+ equipState+GameConst.FILES.EXTENSIONS.PNG;
    }

    /**
     * @param {number} groupId
     * @param {Object<string, Object>} groupsList
     * @returns {Object|boolean}
     */
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

module.exports.InventoryItemDisplay = InventoryItemDisplay;
