const PhaserGame = require('phaser').Game;
const TemplateEngine = require('mustache');

class GameEngine extends PhaserGame
{

    constructor(GameConfig)
    {
        super(GameConfig);
        this.uiScene = false;
        this.statsDisplayed = false;
        this.TemplateEngine = TemplateEngine;
    }

}

module.exports = GameEngine;
