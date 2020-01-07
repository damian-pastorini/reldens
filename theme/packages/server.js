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
const { Enemy1 } = require('./objects/server/enemy1');
const { Enemy2 } = require('./objects/server/enemy2');

module.exports.CustomClasses = {
    objects: {
        door_1: Door,
        door_2: Door,
        npc_1: People,
        enemy_1: Enemy1,
        enemy_2: Enemy2
    }
};
