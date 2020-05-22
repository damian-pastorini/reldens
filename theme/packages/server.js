/**
 *
 * Reldens - Server/CustomClasses
 *
 * This is actually a configuration class, here you must define all your custom objects classes.
 * The keys for these definitions must match the keys specified in the storage, see table: objects.
 * Below you will find the custom classes from the default theme for objects doors and people.
 *
 */

const { Door } = require('./objects/server/door');
const { People } = require('./objects/server/people');
const { Healer } = require('./objects/server/healer');
const { Merchant } = require('./objects/server/merchant');
const { Enemy1 } = require('./objects/server/enemy1');
const { Enemy2 } = require('./objects/server/enemy2');
const { ItemSingle } = require('@reldens/items-system');
const { HealPotion } = require('./inventory/items/heal-potion');

module.exports.CustomClasses = {
    objects: {
        door_1: Door,
        door_2: Door,
        npc_1: People,
        npc_2: Healer,
        npc_3: Merchant,
        enemy_1: Enemy1,
        enemy_2: Enemy2
    },
    inventory: {
        coins: ItemSingle,
        heal_potion_20: HealPotion
    }
};
