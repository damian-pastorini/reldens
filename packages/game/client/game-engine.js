/**
 *
 * Reldens - GameEngine
 *
 * This class will extend Phaser to include any all the customizations.
 *
 */

const { Game } = require('phaser');
const TemplateEngine = require('mustache');
const { EventsManager } = require('@reldens/utils');

class GameEngine extends Game
{

    constructor(GameConfig)
    {
        super(GameConfig);
        // uiScene is where we will keep all the game UI elements:
        this.uiScene = false;
        this.TemplateEngine = TemplateEngine;
        EventsManager.on('reldens.beforeReconnectGameClient', () => {
            this.clearTarget();
        });
    }

    parseTemplate(template, view, partials, tags)
    {
        return this.TemplateEngine.render(template, view, partials, tags);
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
            let currentScene = this.uiScene.gameManager.activeRoomEvents.getActiveScene();
            currentScene.player.currentTarget = false;
            this.uiScene.uiTarget.getChildByID('box-target').style.display = 'none';
            this.uiScene.uiTarget.getChildByID('target-container').innerHTML = '';
        }
    }

}

module.exports.GameEngine = GameEngine;
