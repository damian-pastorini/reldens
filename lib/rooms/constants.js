/**
 *
 * Reldens - rooms/constants
 *
 */

module.exports.RoomsConst = {
    ROOM_TYPE_SCENE: 'scene',
    ROOM_TYPE_LOGIN: 'login',
    ROOM_TYPE_GAME: 'game',
    TILE_INDEX: 'i',
    NEXT_SCENE: 'n',
    MAPS_BUCKET: '/assets/maps/',
    ROOM_LAST_LOCATION_KEY: '@lastLocation',
    ROOM_CLOSING: 'rc',
    ROOM_REMOVED: 'rrm',
    MESSAGE_LISTENER_KEY: 'rooms',
    DEFAULT_ROOM_CONFIG_PATH: 'players/initialState/room_id',
    RETURN_POINT_KEYS: {
        DIRECTION: 'd',
        X: 'x',
        Y: 'y',
        DEFAULT: 'de',
        PREVIOUS: 'p'
    },
    ERRORS: {
        CREATING_ROOM_AWAIT: 'CREATING-ROOM-AWAIT'
    }
};
