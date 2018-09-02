import Phaser, { Game } from '../../node_modules/phaser';
import Main from './scenes/Main';

const config = {
    type: Phaser.AUTO,
    width: 200,
    height: 200,
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
