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

    constructor(uiSceneManager)
    {
        this.uiSceneManager = uiSceneManager;
    }

    createUi()
    {
        this.create('inventory', 5);
        this.create('equipment', 4);
    }

    create(codeName, depth)
    {
        let consName = codeName.toUpperCase();
        let {uiX, uiY} = this.uiSceneManager.getUiConfig(codeName);
        let newUiObject = this.uiSceneManager.uiSceneDriver.addDomCreateFromCache(uiX, uiY, {the: codeName});
        let closeButton = newUiObject.getChildByProperty('id', InventoryConst[consName+'_CLOSE']);
        let openButton = newUiObject.getChildByProperty('id', InventoryConst[consName+'_OPEN']);
        closeButton?.addEventListener('click', () => {
            let box = newUiObject.getChildByProperty('id', codeName+'-ui');
            box.style.display = 'none';
            let uiPanel = newUiObject.getChildByProperty('id', InventoryConst[consName+'_ITEMS']);
            uiPanel.querySelectorAll('.item-box .image-container img').forEach(function(element){
                element.style.border = 'none';
            });
            uiPanel.querySelectorAll('.item-data-container').forEach(function(element){
                element.style.display = 'none';
            });
            if(openButton){
                openButton.style.display = 'block';
            }
            newUiObject.setDepth(1);
        });
        openButton?.addEventListener('click', () => {
            let box = newUiObject.getChildByProperty('id', codeName+'-ui');
            box.style.display = 'block';
            openButton.style.display = 'none';
            newUiObject.setDepth(depth);
        });
        this.uiSceneManager.uiSceneDriver.setUiElement(codeName, newUiObject);
    }

}

module.exports.InventoryUi = InventoryUi;
