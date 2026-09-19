/**
 *
 * Reldens - ItemsModifiersEnricher
 *
 * Enriches item data with their modifiers information for display purposes.
 *
 */

const { ResolveOperation } = require('./resolve-operation');

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
