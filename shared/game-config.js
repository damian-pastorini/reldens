const Phaser = require('phaser');

// general gama environment configuration:
module.exports = {
    type: Phaser.AUTO,
    parent: 'reldens',
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
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
