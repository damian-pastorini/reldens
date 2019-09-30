const PhaserGame = require('phaser').Game;
const Mustache = require('mustache');

class GameEngine extends PhaserGame
{

    constructor(GameConfig)
    {
        super(GameConfig);
        this.uiScene = false;
        this.statsDisplayed = false;
        this.Mustache = Mustache;
    }

}

module.exports = GameEngine;
