/**
 *
 * Reldens - ItemsFactory
 *
 * Factory for creating item instances from database models.
 * Handles item creation, modifier enrichment, and equipment status.
 *
 */

const { ItemsConst } = require('@reldens/items-system');
const { ModifierConst, Modifier } = require('@reldens/modifiers');
const { Logger, sc } = require('@reldens/utils');

class ItemsFactory
{

    /**
     * @param {Array<Object>} itemsInventoryModels
     * @param {Object} manager
     * @returns {Promise<Object<string, Object>|boolean>}
     */
    static async fromModelsList(itemsInventoryModels, manager)
    {
        if(!itemsInventoryModels.length){
            return false;
        }
        let itemsInstances = {};
        for(let itemInventoryModel of itemsInventoryModels){
            let itemObj = await this.fromModel(itemInventoryModel, manager);
            itemsInstances[itemObj.getInventoryId()] = itemObj;
        }
        return itemsInstances;
    }

    /**
     * @param {Object} itemInventoryModel
     * @param {Object} manager
     * @returns {Promise<Object>}
     */
    static async fromModel(itemInventoryModel, manager)
    {
        let itemClass = sc.get(
            manager.itemClasses,
            itemInventoryModel.related_items_item.key,
            manager.types.classByTypeId(itemInventoryModel.related_items_item.type)
        );
        let itemProps = {
            id: itemInventoryModel.id,
            item_id: itemInventoryModel.related_items_item.id,
            key: itemInventoryModel.related_items_item.key,
            type: itemInventoryModel.related_items_item.type,
            manager: manager,
            label: itemInventoryModel.related_items_item.label,
            description: itemInventoryModel.related_items_item.description,
            qty: itemInventoryModel.qty,
            remaining_uses: itemInventoryModel.remaining_uses,
            is_active: itemInventoryModel.is_active,
            group_id: itemInventoryModel.related_items_item.group_id,
            qty_limit: itemInventoryModel.related_items_item.qty_limit,
            uses_limit: itemInventoryModel.related_items_item.uses_limit,
            useTimeOut: itemInventoryModel.related_items_item.useTimeOut,
            execTimeOut: itemInventoryModel.related_items_item.execTimeOut,
            customData: itemInventoryModel.related_items_item.customData
        };
        let itemObj = new itemClass(itemProps);
        if(itemObj.isType(ItemsConst.TYPES.EQUIPMENT)){
            itemObj.equipped = (1 === itemInventoryModel.is_active);
        }
        await this.enrichWithModifiers(itemInventoryModel, itemObj, manager);
        return itemObj;
    }

    /**
     * @param {Object} itemInventoryModel
     * @param {Object} itemObj
     * @param {Object} manager
     * @returns {Promise<void>}
     */
    static async enrichWithModifiers(itemInventoryModel, itemObj, manager)
    {
        let loadedModifiers = itemInventoryModel.related_items_item?.related_items_item_modifiers;
        if(!loadedModifiers || 0 === loadedModifiers.length){
            return;
        }
        let modifiers = {};
        for(let modifierData of loadedModifiers){
            if(modifierData.operation !== ModifierConst.OPS.SET){
                modifierData.value = Number(modifierData.value);
            }
            modifierData.target = manager.owner;
            modifiers[modifierData.id] = new Modifier(modifierData);
        }
        itemObj.modifiers = modifiers;
    }

}

module.exports.ItemsFactory = ItemsFactory;
