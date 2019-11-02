/**
 *
 * Reldens - Rooms Classes.
 *
 * If you create a custom room class to be defined in the server then the class has to be available here.
 * Note custom room classes that require logged players should extend from the RoomLogin class.
 * We don't need to define here the features rooms classes since those are defined in each feature package.
 *
 */

// @TODO: more room classes could be added using events?
module.exports = {
    // all rooms classes will be defined here so users can override everything.
    RoomGame: require('./game'),
    // RoomScene this is the default class instance for every room defined in the database that doesn't specify a
    // custom room_class.
    RoomScene: require('./scene'),
    // custom class example:
    // a room_class is specified in the database with "MyCustomRoom", which may include custom room onMessage actions
    // then you will need to include it here like:
    // MyCustomRoom: require('../src/mycustomfeature/mycustomroom')
    // the MyCustomRoom class will be called in the rooms/manager in the define method.
};
