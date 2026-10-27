/**
 *
 * Reldens - InventoryConst
 *
 */

const { ModifierConst } = require('@reldens/modifiers');

let prefix = 'ivp'

module.exports.InventoryConst = {
    INVENTORY_ITEMS: 'inventory-items',
    INVENTORY_OPEN: 'inventory-open',
    INVENTORY_CLOSE: 'inventory-close',
    EQUIPMENT_ITEMS: 'equipment-items',
    EQUIPMENT_CLOSE: 'equipment-close',
    EQUIPMENT_OPEN: 'equipment-open',
    ANIMATION_KEY_PREFIX: 'aK_',
    GROUP_BUCKET: '/assets/custom/groups',
    ACTIONS: {
        PREFIX: prefix,
        REMOVE: prefix+'Rm',
        USE: prefix+'Use',
        EQUIP: prefix+'Eqi',
        TRADE_START: prefix+'tStart',
        TRADE_ACCEPTED: prefix+'tAccepted',
        TRADE_SHOW: prefix+'tShow',
        TRADE_ACTION: prefix+'tAction'
    },
    MESSAGE: {
        DATA_VALUES: {
            NAMESPACE: 'items'
        }
    },
    CONSUMED_ITEM_QTY: 1,
    GROWTH: {
        DEFAULT_LEVEL: 1,
        PERCENT_BASE: 100,
        NOT_SCALABLE_OPERATIONS: [ModifierConst.OPS.SET, ModifierConst.OPS.METHOD, ModifierConst.OPS.SET_N],
        MESSAGES: {
            ITEM_REACHED_LEVEL: ' reached level ',
            SENTENCE_END: '.'
        }
    }
};
