/**
 *
 * Reldens - game/constants
 *
 * Project constants and default data.
 * Here we use shortcuts since these are used for all the communications between server and client.
 *
 */

module.exports.GameConst = {
    START_GAME: 's',
    CREATE_PLAYER: 'cp',
    CREATE_PLAYER_RESULT: 'cps',
    CHANGED_SCENE: 'cs',
    RECONNECT: 'r',
    ROOM_GAME: 'room_game',
    SCENE_PRELOADER: 'ScenePreloader',
    PLAYER_STATS: 'ps',
    ICON_STATS: 'player-stats',
    CLIENT_JOINED: 'cj',
    UI: 'ui',
    CLOSE_UI_ACTION: 'closeUi',
    TYPE_PLAYER: 'pj',
    GAME_OVER: 'go',
    REVIVED: 'rv',
    BUTTON_OPTION: 'btn-opt',
    // movement:
    UP: 'up',
    LEFT: 'left',
    DOWN: 'down',
    RIGHT: 'right',
    STOP: 'stop',
    POINTER: 'mp',
    ARROW_DOWN: 'ard',
    // default image key:
    IMAGE_PLAYER: 'player',
    STATUS: {
        ACTIVE: 1,
        DISABLED: 1,
        DEATH: 3
    },
    THEMES: {
        DEFAULT: 'default',
        ASSETS: 'assets',
        CSS: 'css',
        DIST: 'dist',
        THEME: 'theme',
        LIB: 'lib',
        PLUGINS: 'plugins',
        INDEX: 'index.html',
        SCSS_FILE: 'styles.scss',
        CSS_FILE: 'styles.css',
        ADMIN_SCSS_FILE: 'reldens-admin.scss',
        ADMIN_CSS_FILE: 'reldens-admin.css'
    }
};
