/**
 *
 * Reldens - InventoryUi
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
        this.create('inventory', 5);
        this.create('equipment', 4);
    }

    create(codeName, depth)
    {
        let consName = codeName.toUpperCase();
        let {uiX, uiY} = this.uiScene.getUiConfig(codeName);
        let newUiObject = this.uiScene.add.dom(uiX, uiY).createFromCache(codeName);
        let closeButton = newUiObject.getChildByProperty('id', InventoryConst[consName+'_CLOSE']);
        let openButton = newUiObject.getChildByProperty('id', InventoryConst[consName+'_OPEN']);
        if(closeButton && openButton){
            closeButton.addEventListener('click', () => {
                let box = newUiObject.getChildByProperty('id', codeName+'-ui');
                box.style.display = 'none';
                let uiPanel = newUiObject.getChildByProperty('id', InventoryConst[consName+'_ITEMS']);
                uiPanel.querySelectorAll('.item-box .image-container img').forEach(function(element){
                    element.style.border = 'none';
                });
                uiPanel.querySelectorAll('.item-data-container').forEach(function(element){
                    element.style.display = 'none';
                });
                openButton.style.display = 'block';
                newUiObject.setDepth(1);
            });
            openButton.addEventListener('click', () => {
                let box = newUiObject.getChildByProperty('id', codeName+'-ui');
                box.style.display = 'block';
                openButton.style.display = 'none';
                newUiObject.setDepth(depth);
            });
        }
        this.uiScene.elementsUi[codeName] = newUiObject;
    }

}

module.exports.InventoryUi = InventoryUi;
