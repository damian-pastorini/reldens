/**
 *
 * Reldens - MessageActions
 *
 * Server side messages actions.
 *
 */

const { InventoryConst } = require('../constants');

class InventoryMessageActions
{

    // eslint-disable-next-line no-unused-vars
    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        if(!{}.hasOwnProperty.call(data, 'act') || data.act.indexOf(InventoryConst.INVENTORY_PREF) !== 0){
            return false;
        }
        if(data.act === InventoryConst.ACTION_REMOVE){
            playerSchema.inventory.manager.removeItem(data.idx);
        }
        if(data.act === InventoryConst.ACTION_USE){
            playerSchema.inventory.manager.items[data.idx].use();
        }
    }

}

module.exports.InventoryMessageActions = new InventoryMessageActions();
