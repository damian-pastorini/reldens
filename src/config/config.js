/**
 *
 * Reldens - Config
 *
 * This is the main config file, please try not to modify this and create an .env file in your project root to setup all
 * the variables you need to change.
 *
 */

const share = require('./constants');
const Phaser = require('phaser');

const config = {
    app: {
        port: process.env.PORT || process.env.RELDENS_APP_PORT || 8080,
        colyseusMonitor: process.env.RELDENS_COLYSEUS_MONITOR || false
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
        scene: process.env.RELDENS_INITIAL_SCENE_NAME || share.TOWN,
        x: process.env.RELDENS_INITIAL_SCENE_X || 400,
        y: process.env.RELDENS_INITIAL_SCENE_Y || 345,
        dir: process.env.RELDENS_INITIAL_SCENE_DIR || share.DOWN
    },
    phaser: {
        type: process.env.RELDENS_PHASER_TYPE || Phaser.AUTO,
        parent: process.env.RELDENS_PHASER_PARENT || 'reldens',
        dom: {
            createContainer: (process.env.RELDENS_PHASER_DOM === undefined ? process.env.RELDENS_PHASER_DOM : true)
        },
        physics: {
            default: process.env.RELDENS_PHASER_PHYSICS_DEFAULT || 'arcade',
            arcade: {
                gravity: {
                    x: process.env.RELDENS_PHASER_PHYSICS_X || 0,
                    y: process.env.RELDENS_PHASER_PHYSICS_Y || 0
                },
                debug: (process.env.RELDENS_PHASER_PHYSICS_DEBUG === undefined ?
                    process.env.RELDENS_PHASER_PHYSICS_DEBUG : false)
            }
        },
        scale: {
            parent: process.env.RELDENS_PHASER_SCALE_PARENT || 'reldens',
            mode: process.env.RELDENS_PHASER_SCALE_MODE || Phaser.Scale.FIT,
            width: process.env.RELDENS_PHASER_SCALE_WIDTH || 500,
            height: process.env.RELDENS_PHASER_SCALE_HEIGHT || 500,
            min: {
                width: process.env.RELDENS_PHASER_SCALE_MIN_WIDTH || 300,
                height: process.env.RELDENS_PHASER_SCALE_MIN_HEIGHT || 500
            },
            autoCenter: process.env.RELDENS_PHASER_SCALE_AUTOCENTER || Phaser.Scale.CENTER_BOTH
        }
    }
};

module.exports = config;
