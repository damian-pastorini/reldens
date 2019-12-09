/**
 *
 * Reldens - Client/CustomClasses
 *
 * This is actually a configuration class, here you must define all your custom objects and rooms classes.
 * The keys for these definitions must match the keys specified in the storage, see tables: objects.
 * Below you will find the custom classes from the default theme for people.
 *
 */

const { Npc1 } = require('./objects/client/npc1');

module.exports.CustomClasses = {
    objects: {
        people_town_1: Npc1
    }
};
