/**
 *
 * Reldens - ChatUiCreate
 *
 * This class will handle the inventory UI and assign all the related events and actions.
 *
 */

const { InventoryConst } = require('../constants');

class InventoryUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
    }

    createUi()
    {
        let inventoryX = this.gameManager.config.get('client/inventory/position/x');
        let inventoryY = this.gameManager.config.get('client/inventory/position/y');
        this.uiScene.uiInventory = this.uiScene.add.dom(inventoryX, inventoryY).createFromCache('uiInventory');
        let inventoryCloseButton = this.uiScene.uiInventory.getChildByProperty('id', InventoryConst.INVENTORY_CLOSE_BUTTON);
        let inventoryOpenButton = this.uiScene.uiInventory.getChildByProperty('id', InventoryConst.INVENTORY_OPEN_BUTTON);
        if(inventoryCloseButton && inventoryOpenButton){
            inventoryCloseButton.addEventListener('click', () => {
                let box = this.uiScene.uiInventory.getChildByProperty('id', 'inventory-ui');
                box.style.display = 'none';
                inventoryOpenButton.style.display = 'block';
                this.uiScene.uiInventory.setDepth(1);
            });
            inventoryOpenButton.addEventListener('click', () => {
                let box = this.uiScene.uiInventory.getChildByProperty('id', 'inventory-ui');
                box.style.display = 'block';
                inventoryOpenButton.style.display = 'none';
                this.uiScene.uiInventory.setDepth(4);
            });
        }
    }

}

module.exports.InventoryUi = InventoryUi;
