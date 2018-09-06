const Phaser = require('phaser');
const Game = Phaser.Game;

const Main = require('./scenes/Main');

const config = {
    type: Phaser.AUTO,
    width: 350,
    height: 350,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [Main],
};

const game = new Game(config);
