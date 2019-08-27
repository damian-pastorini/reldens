/**
 *
 * Reldens - config/config
 *
 * This is the main config file, please try not to modify this and create an .env file in your project root to setup all
 * the variables you need to change.
 *
 */

const share = require('../utils/constants');

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
    }
};

module.exports = config;
