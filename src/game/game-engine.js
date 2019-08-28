const PhaserGame = require('phaser').Game;

class GameEngine extends PhaserGame
{

    constructor(GameConfig)
    {
        super(GameConfig);
        this.uiScene = false;
        this.statsDisplayed = false;
    }

}

module.exports = GameEngine;
