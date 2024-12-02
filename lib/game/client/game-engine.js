/**
 *
 * Reldens - GameEngine
 *
 */

const TemplateEngineRender = require('mustache');
const { Game, Input } = require('phaser');
const { FPSCounter } = require('./fps-counter');
const { GameConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { Logger, sc } = require('@reldens/utils');

class GameEngine extends Game
{

    constructor(props)
    {
        super(props.config);
        Logger.debug('Game Engine configuration.', props.config);
        // @TODO - BETA - Refactor the entire class:
        //      - Extract all Phaser methods into the engine driver class and implement the engine on the GameManager.
        //      - Extract the template parsing into a new "template" or "elements" domain driver.
        //      - Extract the screen resize methods into a new ScreenHandler class.
        //      - Extract the tab target methods into a new TabPlugin class.
        // uiScene is where we will keep all the game UI elements:
        this.uiScene = false;
        this.TemplateEngine = TemplateEngineRender;
        this.eventsManager = props.events;
        this.eventsManager.on('reldens.beforeReconnectGameClient', () => {
            this.clearTarget();
        });
        this.eventsManager.on('reldens.beforeSceneDynamicCreate', (sceneDynamic) => {
            this.setupTabTarget(sceneDynamic);
        });
    }

    parseTemplate(template, view, partials, tags)
    {
        return this.TemplateEngine.render(template, view, partials, tags);
    }

    updateGameSize(manager)
    {
        let {newWidth, newHeight} = this.getCurrentScreenSize(manager);
        setTimeout(() => {
            this.eventsManager.emit('reldens.updateGameSizeBefore', this, newWidth, newHeight);
            this.scale.setGameSize(newWidth, newHeight);
            for(let key of Object.keys(this.uiScene.elementsUi)){
                let uiElement = this.uiScene.elementsUi[key];
                let positionKey = sc.get(this.uiScene.userInterfaces[key], 'uiPositionKey', key);
                let {uiX, uiY} = this.uiScene.getUiConfig(positionKey, newWidth, newHeight);
                uiElement.x = uiX;
                uiElement.y = uiY;
            }
            this.eventsManager.emit('reldens.updateGameSizeAfter', this, newWidth, newHeight);
        }, manager.config.getWithoutLogs('client/general/gameEngine/updateGameSizeTimeOut', 500));
    }

    getCurrentScreenSize(manager)
    {
        let gameContainer = manager.gameDom.getElement(GameConst.SELECTORS.GAME_CONTAINER);
        let containerWidth = gameContainer.offsetWidth;
        let containerHeight = gameContainer.offsetHeight;
        let newWidth = containerWidth;
        let newHeight = containerHeight;
        let mapWidth = 0, mapHeight = 0;
        let activeScene = manager.getActiveScene();
        if(activeScene && activeScene.map){
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

    showTarget(targetName, target, previousTarget)
    {
        if(sc.hasOwn(this.uiScene, 'uiTarget')){
            this.uiScene.uiTarget.getChildByID('box-target').style.display = 'block';
            this.uiScene.uiTarget.getChildByID('target-container').innerHTML = this.targetDisplay(targetName, target);
        }
        this.eventsManager.emit('reldens.gameEngineShowTarget', this, target, previousTarget, targetName);
    }

    targetDisplay(targetName, target)
    {
        let targetDisplayContent = targetName;
        if(GameConst.TYPE_PLAYER === target.type){
            targetDisplayContent += this.generateTargetPlayedTime(target);
        }
        return targetDisplayContent;
    }

    generateTargetPlayedTime(target)
    {
        let playerTimeText = '';
        let showPlayedTimeConfig = this.uiScene.gameManager.config.getWithoutLogs(
            'client/players/playedTime/show',
            GameConst.SHOW_PLAYER_TIME.ONLY_OWN_PLAYER
        );
        if(GameConst.SHOW_PLAYER_TIME.NONE === showPlayedTimeConfig){
            return playerTimeText;
        }
        let currentPlayer = this.uiScene.gameManager.getCurrentPlayer();
        if(GameConst.SHOW_PLAYER_TIME.ALL_PLAYERS === showPlayedTimeConfig || currentPlayer.playerId === target.id){
            let targetPlayedTime = this.obtainPlayedTime(target, currentPlayer);
            playerTimeText += this.createPlayedTimeLabel(targetPlayedTime);
        }
        return playerTimeText;
    }

    createPlayedTimeLabel(playedTime)
    {
        let htmlElement = this.uiScene.gameManager.gameDom.createElement('p');
        htmlElement.innerHTML = this.uiScene.gameManager.config.get('client/players/playedTime/label').replace(
            '%playedTimeInHs',
            playedTime
        );
        return htmlElement.outerHTML;
    }

    obtainPlayedTime(target, currentPlayer)
    {
        return (currentPlayer.players[target.id].playedTime / 60 / 60).toFixed(1);
    }

    clearTarget()
    {
        let currentScene = this.uiScene.gameManager.activeRoomEvents.getActiveScene();
        let clearedTargetData = Object.assign({}, currentScene.player.currentTarget);
        if(sc.hasOwn(this.uiScene, 'uiTarget')){
            currentScene.player.currentTarget = false;
            // @TODO - BETA - Refactor to replace styles by classes.
            this.uiScene.uiTarget.getChildByID('box-target').style.display = 'none';
            this.uiScene.uiTarget.getChildByID('target-container').innerHTML = '';
        }
        this.eventsManager.emit('reldens.gameEngineClearTarget', this, clearedTargetData);
    }

    setupTabTarget(sceneDynamic)
    {
        sceneDynamic.keyTab = sceneDynamic.input.keyboard.addKey(Input.Keyboard.KeyCodes.TAB);
        sceneDynamic.input.keyboard['addCapture'](Input.Keyboard.KeyCodes.TAB);
        sceneDynamic.input.keyboard.on('keydown', (event) => {
            if(9 === event.keyCode){
                this.tabTarget();
            }
        });
    }

    tabTarget()
    {
        let currentPlayer = this.uiScene.gameManager.getCurrentPlayer();
        let objects = this.uiScene.gameManager.getActiveScene().objectsAnimations;
        let players = currentPlayer.players;
        let closerTarget = false;
        let targetName = '';
        let previousTarget = currentPlayer.currentTarget ? Object.assign({}, currentPlayer.currentTarget) : false;
        for(let i of Object.keys(objects)){
            if(!objects[i].targetName){
                continue;
            }
            let dist = Math.hypot(objects[i].x-currentPlayer.state.x, objects[i].y-currentPlayer.state.y);
            if(currentPlayer.currentTarget.id !== objects[i].key && (!closerTarget || closerTarget.dist > dist)){
                closerTarget = {id: objects[i].key, type: ObjectsConst.TYPE_OBJECT, dist};
                targetName = objects[i].targetName;
            }
        }
        for(let i of Object.keys(players)){
            if(currentPlayer.playerName === players[i].playerName){
                continue;
            }
            let dist = Math.hypot(players[i].x-currentPlayer.state.x, players[i].y-currentPlayer.state.y);
            if(currentPlayer.currentTarget.id !== players[i].id && (!closerTarget || closerTarget.dist > dist)){
                closerTarget = {id: i, type: GameConst.TYPE_PLAYER, dist};
                targetName = players[i].playerName;
            }
        }
        currentPlayer.currentTarget = closerTarget;
        this.showTarget(targetName, closerTarget, previousTarget);
        this.eventsManager.emit('reldens.gameEngineTabTarget', this, closerTarget, previousTarget);
    }

    showFPS()
    {
        this.fpsCounter = new FPSCounter(this.uiScene.gameManager.gameDom);
        this.fpsCounter.start();
    }

}

module.exports.GameEngine = GameEngine;
