/**
 *
 * Reldens - Server/CustomClasses
 *
 * This is actually a configuration class, here you must define all your custom objects and rooms classes.
 * Below you will find the custom classes from the default theme:
 * - for objects doors and people.
 * - for rooms TestRoom.
 *
 * The keys for these definitions must match the keys specified in the storage, see tables: objects and rooms.
 *
 */

const { Door } = require('./objects/server/door');
const { People } = require('./objects/server/people');

module.exports.CustomClasses = {
    objects: {
        door_1: Door,
        door_2: Door,
        npc_1: People
    }
};
