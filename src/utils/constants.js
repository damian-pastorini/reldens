/**
 *
 * Reldens - utils/constants
 *
 * Project constants and default data.
 * Here we use shortcuts since these are used for all the communications between server and client.
 *
 */

// constants:
module.exports = {
    START_GAME: 's',
    ADD_PLAYER: 'a',
    CHANGED_SCENE: 'cs',
    RECONNECT: 'r',
    ROOM_GAME: 'room_game',
    SCENE_PRELOADER: 'ScenePreloader',
    // chat:
    CHAT_ACTION: 'c',
    CHAT_MESSAGE: 'm',
    CHAT_FROM: 'f',
    CHAT_TO: 't',
    CHAT_FORM: 'chat-form',
    CHAT_MESSAGES: 'chat-messages',
    CHAT_INPUT: 'chat-input',
    CHAT_SEND_BUTTON: 'chat-send',
    CHAT_GLOBAL: 'chat_global',
    CHAT_JOINED: 'j',
    PLAYER_STATS: 'ps',
    ICON_STATS: 'player-stats',
    CLIENT_JOINED: 'cj',
    // movement:
    UP: 'up',
    LEFT: 'left',
    DOWN: 'down',
    RIGHT: 'right',
    STOP: 'stop',
    // collisions:
    COL_PLAYER: Math.pow(2,0),
    COL_ENEMY: Math.pow(2,1),
    COL_GROUND: Math.pow(2,2),
    // @TODO: the following constants additionally will be part of the configuration in the database.
    // default data:
    IMAGE_PLAYER: 'player',
    TOWN: 'ReldensTown',
    FADE_DURATION: 1000,
    SPEED_SERVER: 180
    // @TODO: speed will be implemented with the client prediction in a future version.
    // See NEXT items in Road Map: https://github.com/damian-pastorini/reldens/wiki/Road-Map
    // SPEED: 150,
};
