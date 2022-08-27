/**
 *
 * Reldens - MessageActions
 *
 * Server side messages actions.
 *
 */

const { InventoryConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class InventoryMessageActions
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(!sc.hasOwn(data, 'act') || 0 !== data.act.indexOf(InventoryConst.INVENTORY_PREF)){
            return false;
        }
        if(InventoryConst.ACTION_REMOVE === data.act){
            playerSchema.inventory.manager.removeItem(data.idx);
        }
        if(InventoryConst.ACTION_USE === data.act){
            if(!sc.hasOwn(playerSchema.inventory.manager.items, data.idx)){
                Logger.info('Cannot use item, key not found: '+data.idx);
                return false;
            }
            playerSchema.inventory.manager.items[data.idx].use();
        }
        if(InventoryConst.ACTION_EQUIP === data.act){
            // @TODO - BETA - This is temporal since for now we are only allowing one item per group. In the future
            //   we will use inventory groups properly on the server side to validate if the item can be equipped
            //   checking the group items limit (this also would help to avoid looping on all the items).
            let item = playerSchema.inventory.manager.items[data.idx];
            if(!item.equipped){
                this.unEquipPrevious(item.group_id, playerSchema.inventory.manager.items);
                await item.equip();
                return true;
            }
            await item.unequip();
        }
    }

    unEquipPrevious(groupId, itemsList)
    {
        for(let i of Object.keys(itemsList)){
            let item = itemsList[i];
            if(item.group_id === groupId && item.equipped){
                item.unequip();
                break;
            }
        }
    }

}

module.exports.InventoryMessageActions = new InventoryMessageActions();
