/**
 *
 * Reldens - config/game-engine
 *
 * Please do not to modify this file!
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

// client config will be sent onJoin.
module.exports = {
    // @NOTE: the game server URL will be part of the configuration in the database.
    serverUrl: process.env.RELDENS_GAMESERVER_URL || false,
    type: Number(process.env.RELDENS_CLIENT_TYPE) || Phaser.AUTO, // 0
    parent: process.env.RELDENS_CLIENT_PARENT || 'reldens',
    dom: {
        createContainer: process.env.RELDENS_CLIENT_DOM || true
    },
    physics: {
        default: process.env.RELDENS_CLIENT_PHYSICS_DEFAULT || 'arcade',
        arcade: {
            gravity: {
                x: Number(process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_X) || 0,
                y: Number(process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_Y) || 0
            },
            debug: process.env.RELDENS_CLIENT_PHYSICS_DEBUG || false
        }
    },
    scale: {
        parent: process.env.RELDENS_CLIENT_SCALE_PARENT || 'reldens',
        mode: Number(process.env.RELDENS_CLIENT_SCALE_MODE) || Phaser.Scale.FIT, // 3
        width: Number(process.env.RELDENS_CLIENT_SCALE_WIDTH) || 500,
        height: Number(process.env.RELDENS_CLIENT_SCALE_HEIGHT) || 500,
        min: {
            width: Number(process.env.RELDENS_CLIENT_SCALE_MIN_WIDTH) || 300,
            height: Number(process.env.RELDENS_CLIENT_SCALE_MIN_HEIGTH) || 500
        },
        autoCenter: Number(process.env.RELDENS_CLIENT_SCALE_AUTOCENTER) || Phaser.Scale.CENTER_BOTH // 1
    }
};
