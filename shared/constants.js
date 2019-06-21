// constants:
module.exports = {
    // Note: use shortcuts since these are used for all the communications between server and client.
    START_GAME: 'sg',
    ADD_PLAYER: 'ap',
    CHANGED_SCENE: 'cs',
    RECONNECT: 'r',
    ROOM_GAME: 'room_game',
    SCENE_INIT: 'SceneInit',
    // player movement:
    UP: 'up',
    LEFT: 'left',
    DOWN: 'down',
    RIGHT: 'right',
    STOP: 'stop',
    // @TODO: this should be part of the server configuration.
    // collisions tests:
    COL_PLAYER: Math.pow(2,0),
    COL_ENEMY: Math.pow(2,1),
    COL_GROUND: Math.pow(2,2),
    FADE_DURATION: 1000,
    SPEED_SERVER: 180,
    CHAT: 'chat',
    // @TODO: speed will be implemented with the client prediction in a future version.
    // SPEED: 150,
    // Note: town is for the initial scene.
    TOWN: 'Town',
    // @TODO: this will be from the DB.
    IMAGE_PLAYER: 'player',
    IMAGE_HOUSE: 'house',
    IMAGE_TOWN: 'town',
    MAP_HOUSE_1: 'house-1',
    MAP_HOUSE_2: 'house-2',
    MAP_TOWN: 'town'
};
