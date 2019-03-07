// constants:
module.exports = {
    // Note: use shortcuts since these are used for all the communications between server and client.
    START_GAME: 'sg',
    KEY_PRESS: 'kp',
    CREATE_PLAYER: 'cp',
    ADD_PLAYER: 'ap',
    CHANGED_SCENE: 'cs',
    CLIENT_CHANGED_SCENE: 'ccs',
    RECONNET: 'r',
    ADD_FROM_SCENE: 'afs',
    REMOVE: 'r',
    ROOM_GAME: 'room_game',
    SCENE_INIT: 'SceneInit',
    // Note: town is for the initial scene.
    TOWN: 'Town',
    // player movement:
    UP: 'up',
    LEFT: 'left',
    DOWN: 'down',
    RIGHT: 'right',
    STOP: 'stop',
    MOVE: 'move',
    CHAT: 'chat',
    // @TODO: this should be part of the server configuration.
    FADE_DURATION: 1000,
    WIDTH: 350,
    HEIGHT: 350,
    SPEED: 10, //150,
    SPEED_SERVER: 180,
    // @TODO: this will be from the DB.
    IMAGE_PLAYER: 'player',
    IMAGE_HOUSE: 'house',
    IMAGE_TOWN: 'town',
    MAP_HOUSE_1: 'map-house-1',
    MAP_HOUSE_2: 'map-house-2',
    MAP_TOWN: 'map-town',
    // collisions tests:
    COL_PLAYER: Math.pow(2,0),
    COL_ENEMY: Math.pow(2,1),
    COL_GROUND: Math.pow(2,2)
}
