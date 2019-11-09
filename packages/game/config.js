/**
 *
 * Reldens - config/game-engine
 *
 * Please do not to modify this file!
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

 // @TODO: - Seiyria - if these don't change, they should be const
const gravityX = process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_X ? Number(process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_X) : 0;
const gravityY = process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_Y ? Number(process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_Y) : 0;
const scaleMode = process.env.RELDENS_CLIENT_SCALE_MODE ?
    Number(process.env.RELDENS_CLIENT_SCALE_MODE) : 3; // Phaser.Scale.FIT
const scaleWidth = process.env.RELDENS_CLIENT_SCALE_WIDTH ? Number(process.env.RELDENS_CLIENT_SCALE_WIDTH) : 500;
const scaleHeight = process.env.RELDENS_CLIENT_SCALE_HEIGHT ? Number(process.env.RELDENS_CLIENT_SCALE_HEIGHT) : 500;
const scaleMinWidth = process.env.RELDENS_CLIENT_SCALE_MIN_WIDTH
    ? Number(process.env.RELDENS_CLIENT_SCALE_MIN_WIDTH) : 300;
const scaleMinHeight = process.env.RELDENS_CLIENT_SCALE_MIN_HEIGHT
    ? Number(process.env.RELDENS_CLIENT_SCALE_MIN_HEIGHT) : 500;
const scaleAutoCenter = process.env.RELDENS_CLIENT_SCALE_AUTOCENTER
    ? Number(process.env.RELDENS_CLIENT_SCALE_AUTOCENTER) : 1; // Phaser.Scale.CENTER_BOTH

// client config will be sent onJoin.
module.exports.GameConfig = {
    // @NOTE: the game server URL will be part of the configuration in the database.
    serverUrl: process.env.RELDENS_GAMESERVER_URL || false,
    type: process.env.RELDENS_CLIENT_TYPE ? Number(process.env.RELDENS_CLIENT_TYPE) : 0, // Phaser.AUTO
    parent: process.env.RELDENS_CLIENT_PARENT || 'reldens',
    dom: {
        createContainer: process.env.RELDENS_CLIENT_DOM || true
    },
    physics: {
        default: process.env.RELDENS_CLIENT_PHYSICS_DEFAULT || 'arcade',
        arcade: {
            gravity: {
                x: gravityX,
                y: gravityY,
            },
            debug: process.env.RELDENS_CLIENT_PHYSICS_DEBUG || false
        }
    },
    scale: {
        parent: process.env.RELDENS_CLIENT_SCALE_PARENT || 'reldens',
        mode: scaleMode,
        width: scaleWidth,
        height: scaleHeight,
        min: {
            width: scaleMinWidth,
            height: scaleMinHeight
        },
        autoCenter: scaleAutoCenter
    }
};
