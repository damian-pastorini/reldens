/**
 *
 * Reldens - ItemsModifiersEnricher
 *
 * Enriches item data with their modifiers information for display purposes. The player items keep their display data
 * in their "customData" ("modifiersDisplay" and "growthLevel", 0 when the item does not grow), sent to the client by
 * the items sender with the item add, set, equip and unequip messages, where every created item spreads it.
 *
 */

const { ResolveOperation } = require('./resolve-operation');
const { sc } = require('@reldens/utils');

class ItemsModifiersEnricher
{

    static enrichWithModifiers(sendItems, inventoryItems)
    {
        for(let i of Object.keys(inventoryItems)){
            let item = inventoryItems[i];
            let uid = item.getInventoryId();
            if(!sendItems[uid]){
                continue;
            }
            sendItems[uid].modifiers = ItemsModifiersEnricher.extractModifiers(item);
        }
        return sendItems;
    }

    static applyDisplayData(item)
    {
        item.customData = {
            modifiersDisplay: ItemsModifiersEnricher.extractModifiers(item),
            growthLevel: Number(sc.get(item, 'growthLevel', 0))
        };
        return item;
    }

    static extractModifiers(item)
    {
        if(!item.modifiers || 0 === Object.keys(item.modifiers).length){
            return [];
        }
        return Object.keys(item.modifiers).map(modifierId => {
            let modifier = item.modifiers[modifierId];
            let label = modifier.propertyKey.split('/').pop();
            let operation = modifier.operation;
            let prefix = ResolveOperation.prefix(operation);
            let suffix = ResolveOperation.suffix(operation);
            return {
                propertyKey: modifier.propertyKey,
                operation: modifier.operation,
                value: modifier.value,
                display: prefix + modifier.value + suffix + ' ' + label
            };
        });
    }

}

module.exports.ItemsModifiersEnricher = ItemsModifiersEnricher;
