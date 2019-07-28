// constants:
module.exports = {
    // Note: use shortcuts since these are used for all the communications between server and client.
    START_GAME: 's',
    ADD_PLAYER: 'a',
    CHANGED_SCENE: 'cs',
    RECONNECT: 'r',
    ROOM_GAME: 'room_game',
    SCENE_PRELOADER: 'ScenePreloader',
    // player movement:
    UP: 'up',
    LEFT: 'left',
    DOWN: 'down',
    RIGHT: 'right',
    STOP: 'stop',
    // @TODO: this will be part of the configuration in the database.
    // collisions tests:
    COL_PLAYER: Math.pow(2,0),
    COL_ENEMY: Math.pow(2,1),
    COL_GROUND: Math.pow(2,2),
    FADE_DURATION: 1000,
    SPEED_SERVER: 180,
    CHAT_ACTION: 'c',
    CHAT_MESSAGE: 'm',
    CHAT_FROM: 'f',
    CHAT_TO: 't',
    CHAT_FORM: 'chat-form',
    CHAT_MESSAGES: 'chat-messages',
    CHAT_INPUT: 'chat-input',
    CHAT_GLOBAL: 'chat_global',
    IMAGE_PLAYER: 'player',
    // Note: town is for the initial scene.
    TOWN: 'ReldensTown'
    // @TODO: speed will be implemented with the client prediction in a future version.
    // See NEXT items in Road Map: https://github.com/damian-pastorini/reldens/wiki/Road-Map
    // SPEED: 150,
};
