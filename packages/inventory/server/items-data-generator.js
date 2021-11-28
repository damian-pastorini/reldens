/**
 *
 * Reldens - ItemsDataGenerator
 *
 */

const { ItemBase } = require('@reldens/items-system');
const { ModifierConst, Modifier } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

class ItemsDataGenerator
{

    static async appendItemsFullList(configProcessor, inventoryModelsManager)
    {
        // use the inventory models manager to get the items list loaded:
        let itemsModelsList = await inventoryModelsManager.getEntity('item').loadAllWithRelations();
        if(0 === itemsModelsList.length){
            return {};
        }
        let itemsList = {};
        let inventoryClasses = configProcessor.get('server/customClasses/inventory/items');
        for(let itemModel of itemsModelsList){
            let itemClass = ItemBase;
            if(itemModel.items_modifiers){
                itemModel.modifiers = this.generateItemModifiers(itemModel);
            }
            if(sc.hasOwn(inventoryClasses, itemModel.key)){
                itemClass = inventoryClasses[itemModel.key];
            }
            itemsList[itemModel.key] = {class: itemClass, data: itemModel};
        }
        configProcessor.inventory.items = {itemsModels: itemsModelsList, itemsList};
        return configProcessor.inventory.items;
    }

    static generateItemModifiers(itemModel)
    {
        let modifiers = {};
        for(let modifierData of itemModel.items_modifiers){
            if(modifierData.operation !== ModifierConst.OPS.SET){
                modifierData.value = Number(modifierData.value);
            }
            modifiers[modifierData.id] = new Modifier(modifierData);
        }
        return modifiers;
    }
}

module.exports.ItemsDataGenerator = ItemsDataGenerator;