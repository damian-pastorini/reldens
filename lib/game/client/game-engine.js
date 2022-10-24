/**
 *
 * Reldens - GameEngine
 *
 * This class will extend Phaser to include any all the customizations.
 *
 */

const TemplateEngine = require('mustache');
const { GameConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { sc, ErrorManager } = require('@reldens/utils');

class GameEngine
{

    constructor(props)
    {
        // @TODO - BETA - Refactor the entire class:
        //      - Extract all Phaser methods into the engine driver class and implement the engine on the GameManager.
        //      - Extract the template parsing into a new "template" or "elements" domain driver.
        //      - Extract the screen resize methods into a new ScreenHandler class.
        //      - Extract the tab target methods into a new TabPlugin class.

        // @TODO: remove this manager from here. Circular references between objects is a bad practice.
        this.gameManager = props.gameManager;
        // uiScene is where we will keep all the game UI elements:
        this.TemplateEngine = TemplateEngine;
        this.eventsManager = props.events;
        this.eventsManager.on('reldens.beforeReconnectGameClient', () => {
            this.clearTarget();
        });
        this.eventsManager.on('reldens.beforeSceneDynamicCreate', (sceneDynamic) => {
            this.setupSelectTargetOnTabKeyDown(sceneDynamic);
        });
        this.eventsManager.on('reldens.createPreload', (scenePreloader, scene) => this.scenePreloader = scenePreloader);
        this.engineDriver = {};
        this.checkGameEngineDriverErrors(props);
        this.setupGameEngineDriver(props.config, props.gameEngineDriver);
        this.engineDriver.loadEngine();
    }

    checkGameEngineDriverErrors(props)
    {
        if (!sc.hasOwn(props, "gameEngineDriver")) {
            throw new Error('ERROR - Missing "gameEngineDriver" definition in GameEngine class');
        }
        if (!sc.hasOwn(props, "config")) {
            throw new Error('ERROR - Missing gameEngine "config" definition in GameEngine class');
        }
    }

    setupGameEngineDriver(config, gameEngineDriver)
    {
        this.engineDriver = gameEngineDriver;
        this.engineDriver.setConfig({config: config});
    }

    parseTemplate(template, view, partials, tags)
    {
        return this.TemplateEngine.render(template, view, partials, tags);
    }

    updateGameSize()
    {
        // get the window size:
        let {newWidth, newHeight} = this.getCurrentScreenSize();
        // @TODO - BETA - Make timeout 500 configurable.
        setTimeout(() => {
            this.eventsManager.emit('reldens.updateGameSizeBefore', this, newWidth, newHeight);
            this.engineDriver.setGameSize(newWidth, newHeight);
            let scenePreloader = this.scenePreloader;
            for(let key of Object.keys(scenePreloader.sceneDriver.getAllUiElements())){
                let {uiX, uiY} = scenePreloader.getUiConfig(key, newWidth, newHeight);
                let uiElement = scenePreloader.sceneDriver.getUiElement(key);
                uiElement.x = uiX;
                uiElement.y = uiY;
            }
            this.eventsManager.emit('reldens.updateGameSizeAfter', this, newWidth, newHeight);
        }, 500);
    }

    getCurrentScreenSize()
    {
        let containerWidth = this.gameManager.gameDom.getElement('.game-container').offsetWidth;
        let containerHeight = this.gameManager.gameDom.getElement('.game-container').offsetHeight;
        let newWidth = containerWidth;
        let newHeight = containerHeight;
        let mapWidth = 0, mapHeight = 0;
        let activeScene = this.gameManager.getActiveScene();
        if(activeScene && activeScene.map){
            // get the map max values and use the
            mapWidth = activeScene.map.width * activeScene.map.tileWidth;
            newWidth = Math.min(containerWidth, mapWidth);
            mapHeight = activeScene.map.height * activeScene.map.tileHeight;
            newHeight = Math.min(containerHeight, mapHeight);
        }
        let maxUiW = Number(this.gameManager.config.get('client/ui/maximum/x'));
        newWidth = Math.min(newWidth, maxUiW);
        let maxUiY = Number(this.gameManager.config.get('client/ui/maximum/y'));
        newHeight = Math.min(newHeight, maxUiY);
        return {newWidth, newHeight};
    }

    showTarget(targetName, target, previousTarget)
    {
        let scenePreloader = this.gameManager.activeRoomEvents.scenePreloader;
        if(sc.hasOwn(scenePreloader, 'uiTarget') && sc.length(scenePreloader.uiTarget) > 0){
            scenePreloader.uiTarget.getChildByID('box-target').style.display = 'block';
            scenePreloader.uiTarget.getChildByID('target-container').innerHTML = this.targetDisplay(targetName, target);
        }
        this.eventsManager.emit('reldens.gameEngineShowTarget', this, target, previousTarget);
    }

    targetDisplay(targetName, target)
    {
        // @TODO - BETA - Refactor.
        let gameManager = this.gameManager;
        let showPlayedTime = gameManager.config.get('client/players/playedTime/show');
        if(0 === showPlayedTime || GameConst.TYPE_PLAYER !== target.type){
            return targetName;
        }
        let currentPlayer = gameManager.getCurrentPlayer();
        let timeText = '';
        let label = gameManager.config.get('client/players/playedTime/label');
        if(0 < showPlayedTime && currentPlayer.playerId === target.id){
            let element = gameManager.gameDom.createElement('p');
            element.innerHTML = label+(currentPlayer.playedTime / 60 / 60).toFixed(1)+'hs';
            timeText = element.outerHTML;
        }
        if(2 === showPlayedTime && sc.hasOwn(currentPlayer.players, target.id)){
            let element = gameManager.gameDom.createElement('p');
            element.innerHTML = label+(currentPlayer.players[target.id].playedTime / 60 / 60).toFixed(1)+'hs';
            timeText = element.outerHTML;
        }
        return targetName+timeText;
    }

    clearTarget()
    {
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        let clearedTargetData = Object.assign({}, currentScene.player.currentTarget);
        let scenePreloader = this.gameManager.activeRoomEvents.scenePreloader;
        if(sc.hasOwn(scenePreloader, 'uiTarget') && sc.length(scenePreloader.uiTarget) > 0){
            currentScene.player.currentTarget = false;
            scenePreloader.uiTarget.getChildByID('box-target').style.display = 'none';
            scenePreloader.uiTarget.getChildByID('target-container').innerHTML = '';
        }
        this.eventsManager.emit('reldens.gameEngineClearTarget', this, clearedTargetData);
    }

    setupSelectTargetOnTabKeyDown(sceneDynamic)
    {
        sceneDynamic.keyTab = sceneDynamic.input.keyboard.addKey(this.engineDriver.getTabKeyCode());
        sceneDynamic.input.keyboard['addCapture'](this.engineDriver.getTabKeyCode());
        sceneDynamic.input.keyboard.on('keydown', (event) => {
            if(event.keyCode === this.engineDriver.getTabKeyCode()){
                this.tabTarget();
            }
        });
    }

    tabTarget()
    {
        let currentPlayer = this.gameManager.getCurrentPlayer();
        let objects = this.gameManager.getActiveScene().objectsAnimations;
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

    getScene(scene)
    {
        return this.engineDriver.getScene(scene);
    }

    addScene(key, sceneConfig, autoStart)
    {
        return this.engineDriver.addScene(key, sceneConfig, autoStart);
    }

    startScene(scene)
    {
        this.engineDriver.startScene(scene);
    }

    stopScene(scene)
    {
        this.engineDriver.stopScene(scene);
    }

    instantiateSceneDriver(config)
    {
        return this.engineDriver.createNewSceneDriver(config);
    }

}

module.exports.GameEngine = GameEngine;
