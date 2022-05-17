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

    // eslint-disable-next-line no-unused-vars
    async parseMessageAndRunActions(client, data, room, playerSchema)
    {
        if(!sc.hasOwn(data, 'act') || data.act.indexOf(InventoryConst.INVENTORY_PREF) !== 0){
            return false;
        }
        if(data.act === InventoryConst.ACTION_REMOVE){
            playerSchema.inventory.manager.removeItem(data.idx);
        }
        if(data.act === InventoryConst.ACTION_USE){
            if(!sc.hasOwn(playerSchema.inventory.manager.items, data.idx)){
                Logger.info('Cannot use item, key not found: '+data.idx);
                return false;
            }
            playerSchema.inventory.manager.items[data.idx].use();
        }
        if(data.act === InventoryConst.ACTION_EQUIP){
            // @TODO - BETA - This is temporal since for now we are only allowing one item per group. In the future
            //   we will use inventory groups properly on the server side to validate if the item can be equipped
            //   checking the group items limit (this also would help to avoid looping on all the items).
            let item = playerSchema.inventory.manager.items[data.idx];
            if(!item.equipped){
                this.unEquipPrevious(item.group_id, playerSchema.inventory.manager.items);
                item.equip();
            } else {
                item.unequip();
            }
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
