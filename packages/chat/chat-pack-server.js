/**
 *
 * Reldens - Chat Server Package.
 *
 */

module.exports = {
    // features name convention - room is the room class instance to be defined on the server.
    room: require('./room'),
    // features name convention - messageActions is the class that will handle the room actions on the server class
    // when the client sent a message to the room.
    messageActions: require('./message-actions')
};
