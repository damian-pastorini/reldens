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
        this.create('inventory', 5);
        this.create('equipment', 4);
    }

    create(codeName, depth)
    {
        let uiName = 'ui'+codeName.replace(codeName[0], codeName[0].toUpperCase());
        let consName = codeName.toUpperCase();
        let {uiX, uiY} = this.uiScene.getUiConfig(codeName);
        this.uiScene[uiName] = this.uiScene.add.dom(uiX, uiY).createFromCache(uiName);
        let closeButton = this.uiScene[uiName].getChildByProperty('id', InventoryConst[consName+'_CLOSE']);
        let openButton = this.uiScene[uiName].getChildByProperty('id', InventoryConst[consName+'_OPEN']);
        if(closeButton && openButton){
            closeButton.addEventListener('click', () => {
                let box = this.uiScene[uiName].getChildByProperty('id', codeName+'-ui');
                box.style.display = 'none';
                let uiPanel = this.uiScene[uiName].getChildByProperty('id', InventoryConst[consName+'_ITEMS']);
                uiPanel.querySelectorAll('.item-box .image-container img').forEach(function(element){
                    element.style.border = 'none';
                });
                uiPanel.querySelectorAll('.item-data-container').forEach(function(element){
                    element.style.display = 'none';
                });
                openButton.style.display = 'block';
                this.uiScene[uiName].setDepth(1);
            });
            openButton.addEventListener('click', () => {
                let box = this.uiScene[uiName].getChildByProperty('id', codeName+'-ui');
                box.style.display = 'block';
                openButton.style.display = 'none';
                this.uiScene[uiName].setDepth(depth);
            });
        }
        // @TODO: TEMPORAL, replace references by this.
        this.uiScene.elementsUi[codeName] = this.uiScene[uiName];
    }

}

module.exports.InventoryUi = InventoryUi;
