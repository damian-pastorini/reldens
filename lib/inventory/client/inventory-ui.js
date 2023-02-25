/**
 *
 * Reldens - InventoryUi
 *
 */

const { UiFactory } = require('../../game/client/ui-factory');
const { InventoryConst } = require('../constants');

class InventoryUi extends UiFactory
{

    createUi()
    {
        // @TODO - BETA - Remove and replace by UserInterface.
        this.create('inventory', 5, true, true, null, () => {
            this.inventoryVisibility('inventory');
        });
        this.create('equipment', 4, true, true, null, () => {
            this.inventoryVisibility('inventory');
        });
    }

    inventoryVisibility(constantCodeName)
    {
        let containerId = '#'+InventoryConst[constantCodeName+'_ITEMS'];
        let itemImages = this.gameManager.gameDom.getElements(containerId+' .item-box .image-container img');
        for(let itemImage of itemImages){
            itemImage.style.border = 'none';
        }
        let itemContainers = this.gameManager.gameDom.getElements(containerId+' .item-data-container')
        for(let itemContainer of itemContainers){
            itemContainer.style.border = 'none';
        }
    }

}

module.exports.InventoryUi = InventoryUi;
