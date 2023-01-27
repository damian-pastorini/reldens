/**
 *
 * Reldens - chat/constants
 *
 * Inventory constants.
 * Here we use shortcuts since these are used for all the communications between server and client.
 *
 */

let pref = 'ivp'

// constants:
module.exports.InventoryConst = {
    INVENTORY_ITEMS: 'inventory-items',
    INVENTORY_OPEN: 'inventory-open',
    INVENTORY_CLOSE: 'inventory-close',
    EQUIPMENT_ITEMS: 'equipment-items',
    EQUIPMENT_CLOSE: 'equipment-close',
    EQUIPMENT_OPEN: 'equipment-open',
    INVENTORY_PREF: pref,
    // @TODO - BETA - Move inside ACTIONS.
    ACTION_REMOVE: pref+'Rm',
    ACTION_USE: pref+'Use',
    ACTION_EQUIP: pref+'Eqi',
    GROUP_BUCKET: 'assets/custom/groups',
    ACTIONS: {
        TRADE_START: pref+'tStart',
        TRADE_ACCEPTED: pref+'tAccepted',
        TRADE_SHOW: pref+'tShow',
        TRADE_ACTION: pref+'tAction'
    }
};
