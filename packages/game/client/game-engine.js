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
        // uiScene is where we will keep all the game UI elements:
        this.uiScene = false;
        this.TemplateEngine = TemplateEngine;
    }

    showTarget(target)
    {
        if({}.hasOwnProperty.call(this.uiScene, 'uiTarget')){
            this.uiScene.uiTarget.getChildByID('box-target').style.display = 'block';
            this.uiScene.uiTarget.getChildByID('target-container').innerHTML = target;
        }
    }

    clearTarget()
    {
        if({}.hasOwnProperty.call(this.uiScene, 'uiTarget')){
            this.uiScene.uiTarget.getChildByID('box-target').style.display = 'none';
            this.uiScene.uiTarget.getChildByID('target-container').innerHTML = '';
        }
    }

}

module.exports.GameEngine = GameEngine;
