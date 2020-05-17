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
    ITEMS: 'inventory-items',
    CLOSE_BUTTON: 'inventory-close',
    OPEN_BUTTON: 'inventory-open',
    INVENTORY_PREF: pref,
    ACTION_REMOVE: pref+'Rm',
    ACTION_USE: pref+'Use',
    ACTION_EQUIP: pref+'Eqi'
};
