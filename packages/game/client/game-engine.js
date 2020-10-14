/**
 *
 * Reldens - GameEngine
 *
 * This class will extend Phaser to include any all the customizations.
 *
 */

const { Game } = require('phaser');
const TemplateEngine = require('mustache');
const { EventsManagerSingleton } = require('@reldens/utils');

class GameEngine extends Game
{

    constructor(GameConfig)
    {
        super(GameConfig);
        // uiScene is where we will keep all the game UI elements:
        this.uiScene = false;
        this.TemplateEngine = TemplateEngine;
        EventsManagerSingleton.on('reldens.beforeReconnectGameClient', () => {
            this.clearTarget();
        });
    }

    parseTemplate(template, view, partials, tags)
    {
        return this.TemplateEngine.render(template, view, partials, tags);
    }

    updateGameSize(manager)
    {
        // get the window size:
        let {newWidth, newHeight} = this.getCurrentScreenSize(manager);
        setTimeout(() => {
            EventsManagerSingleton.emit('reldens.updateGameSizeBefore', this, newWidth, newHeight);
            manager.gameEngine.scale.setGameSize(newWidth, newHeight);
            for(let key of Object.keys(this.uiScene.elementsUi)){
                let {uiX, uiY} = this.uiScene.getUiConfig(key, newWidth, newHeight);
                let uiElement = this.uiScene.elementsUi[key];
                uiElement.x = uiX;
                uiElement.y = uiY;
            }
            EventsManagerSingleton.emit('reldens.updateGameSizeAfter', this, newWidth, newHeight);
        }, 500);
    }

    getCurrentScreenSize(manager)
    {
        let containerWidth = manager.gameDom.getElement('.game-container').width();
        let containerHeight = manager.gameDom.getElement('.game-container').height();
        let newWidth = containerWidth;
        let newHeight = containerHeight;
        let mapWidth = 0, mapHeight = 0;
        let activeScene = manager.getActiveScene();
        if(activeScene && activeScene.map){
            // get the map max values and use the
            mapWidth = activeScene.map.width * activeScene.map.tileWidth;
            newWidth = Math.min(containerWidth, mapWidth);
            mapHeight = activeScene.map.height * activeScene.map.tileHeight;
            newHeight = Math.min(containerHeight, mapHeight);
        }
        let maxUiW = Number(manager.config.get('client/ui/maximum/x'));
        newWidth = Math.min(newWidth, maxUiW);
        let maxUiY = Number(manager.config.get('client/ui/maximum/y'));
        newHeight = Math.min(newHeight, maxUiY);
        return {newWidth, newHeight};
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
