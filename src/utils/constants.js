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
    CHANGED_SCENE: 'cs',
    RECONNECT: 'r',
    ROOM_GAME: 'room_game',
    SCENE_PRELOADER: 'ScenePreloader',
    PLAYER_STATS: 'ps',
    ICON_STATS: 'player-stats',
    CLIENT_JOINED: 'cj',
    FEATURES: 'gf',
    ROOM_EVENTS: 'roomEvents',
    PRELOAD_HTML: 'html',
    PRELOAD_IMAGE: 'image',
    PRELOAD_SPRITESHEET: 'spritesheet',
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
    FADE_DURATION: 1000,
    SPEED_SERVER: 180
};
