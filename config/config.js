/**
 *
 * Reldens - config/config
 *
 * This is the main config file, please do not to modify this file!
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

const config = {
    app: {
        port: process.env.PORT || process.env.RELDENS_APP_PORT || 8080,
        monitor: process.env.RELDENS_MONITOR || false
    },
    db: {
        engine: process.env.RELDENS_DB_ENGINE || 'mysql',
        host: process.env.RELDENS_DB_HOST || '10.0.2.2',
        port: process.env.RELDENS_DB_PORT || 3306,
        database: process.env.RELDENS_DB_NAME || 'reldens',
        user: process.env.RELDENS_DB_USER || 'reldens',
        password: process.env.RELDENS_DB_PASSWORD || 'reldens',
        connectionLimit: process.env.RELDENS_DB_LIMIT || 10
    },
    initialScene: {
        scene: process.env.RELDENS_INITIAL_SCENE_NAME || 'ReldensTown',
        x: process.env.RELDENS_INITIAL_SCENE_X || 400,
        y: process.env.RELDENS_INITIAL_SCENE_Y || 345,
        dir: process.env.RELDENS_INITIAL_SCENE_DIR || 'down'
    },
    // client config will be sent onJoin.
    gameEngine: {
        // @NOTE: the game server URL will be part of the configuration in the database.
        serverUrl: process.env.RELDENS_GAMESERVER_URL || '',
        type: process.env.RELDENS_CLIENT_TYPE || 0, // Phaser.AUTO,
        parent: process.env.RELDENS_CLIENT_PARENT || 'reldens',
        dom: {
            createContainer: process.env.RELDENS_CLIENT_DOM || true
        },
        physics: {
            default: process.env.RELDENS_CLIENT_PHYSICS_DEFAULT || 'arcade',
            arcade: {
                gravity: {
                    x: process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_X || 0,
                    y: process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_Y || 0
                },
                debug: process.env.RELDENS_CLIENT_PHYSICS_DEBUG || false
            }
        },
        scale: {
            parent: process.env.RELDENS_CLIENT_SCALE_PARENT || 'reldens',
            mode: process.env.RELDENS_CLIENT_SCALE_MODE || 3, // Phaser.Scale.FIT,
            width: process.env.RELDENS_CLIENT_SCALE_WIDTH || 500,
            height: process.env.RELDENS_CLIENT_SCALE_HEIGHT || 500,
            min: {
                width: process.env.RELDENS_CLIENT_SCALE_MIN_WIDTH || 300,
                height: process.env.RELDENS_CLIENT_SCALE_MIN_HEIGTH || 500
            },
            autoCenter: process.env.RELDENS_CLIENT_SCALE_AUTOCENTER || 1 // Phaser.Scale.CENTER_BOTH
        }
    }
};

module.exports = config;
