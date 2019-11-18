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

    constructor(GameConfig)
    {
        super(GameConfig);
        // @TODO: - Seiyria - when naming variables, prefer something descriptive. if this is supposed to be a boolean,
        //   name it something like: isBoolean, or hasBoolean. maybe hasUIScene?
        this.uiScene = false;
        this.TemplateEngine = TemplateEngine;
    }

}

module.exports = GameEngine;
