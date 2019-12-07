/**
 *
 * Reldens - GameEngine
 *
 * This class will extend Phaser to include any all the customizations.
 *
 */

const { Game } = require('phaser');
const TemplateEngine = require('mustache');

class GameEngine extends Game
{

    // uiScene is where we will keep all the game UI elements:
    uiScene = false;

    constructor(GameConfig)
    {
        super(GameConfig);
        this.TemplateEngine = TemplateEngine;
    }

}

module.exports.GameEngine = GameEngine;
