/**
 *
 * Reldens - config/config
 *
 * This is the main config file, please try not to modify this and create an .env file in your project root to setup all
 * the variables you need to change.
 *
 */

const Phaser = require('phaser');

const config = {
    // @NOTE: the game server URL will be part of the configuration in the database.
    // serverUrl: ''
    type: Phaser.AUTO,
    parent: 'reldens',
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                x: 0,
                y: 0
            },
            debug: false
        }
    },
    scale: {
        parent: 'reldens',
        mode: Phaser.Scale.FIT,
        width: 500,
        height: 500,
        min: {
            width: 300,
            height: 500
        },
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

module.exports = config;
