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
const { sc } = require('@reldens/utils');
const { UiSceneManager } = require("./ui-scene-manager");

class GameEngine
{

    constructor(props)
    {
        // @TODO - BETA - Refactor the entire class:
        //      - Extract all Phaser methods into the engine driver class and implement the engine on the GameManager.
        //      - Extract the template parsing into a new "template" or "elements" domain driver.
        //      - Extract the screen resize methods into a new ScreenHandler class.
        //      - Extract the tab target methods into a new TabPlugin class.

        this.gameManager = props.gameManager;
        this.TemplateEngine = TemplateEngine;
        this.eventsManager = props.events;
        this.listenEvents();

        this.engineDriver = {};
        this.checkGameEngineDriverErrors(props);
        this.setupGameEngineDriver(props.config, props.gameEngineDriver);
        this.engineDriver.loadEngine();

        this.uiSceneManager = this.instantiateUiSceneManager(props);
        this.isUiSceneLoaded = false;
    }

    instantiateUiSceneManager(props)
    {
        return new UiSceneManager({
            uiSceneDriver: this.engineDriver.createNewUiSceneDriver({
                sceneName: UiSceneManager.UI_SCENE_KEY,
                parseTemplateCallback: ((template, view, partials, tags) => this.parseTemplate(template, view, partials, tags)),
            }),
            eventsManager: this.eventsManager,
            configManager: this.gameManager.config,
            cleanTargetCallback: (() => this.clearTarget()),
            logoutCallback: props.logoutCallback,
            parseTemplateCallback: ((template, view, partials, tags) => this.parseTemplate(template, view, partials, tags)),
            getActiveRoomEventsCallback: (() => this.gameManager.getActiveRoomEvents()),
            getActiveSceneCallback: (() => this.gameManager.getActiveScene()),
            audioManager: props.audioManager,
            getInventoryCallback: props.getInventoryCallback,
            getCurrentScreenSizeCallback: (() => this.getCurrentScreenSize()),
        });
    }

    listenEvents()
    {
        this.eventsManager.on('reldens.beforeReconnectGameClient', () => {
            this.clearTarget();
        });
        this.eventsManager.on('reldens.beforeSceneDynamicCreate', (sceneDynamic) => {
            this.setupSelectTargetOnTabKeyDown(sceneDynamic);
        });
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

    loadUiScene(onLoadCompleteCallback)
    {
        this.addScene(UiSceneManager.UI_SCENE_KEY, this.uiSceneManager.uiSceneDriver.scene, true);
        this.uiSceneManager.uiSceneDriver.loadOn('complete', () => {
            this.isUiSceneLoaded = true;
            this.uiSceneManager.showPlayerName(this.gameManager.playerData.name);
            onLoadCompleteCallback();
        });
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
            this.uiSceneManager.updateAllUiElementsPosition(newWidth, newHeight);
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
        const uiTargetElementHtml = this.targetDisplay(targetName, target);
        this.uiSceneManager.showUiTargetElement(uiTargetElementHtml);
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

        if(this.uiSceneManager.hasUiTargetLoaded()){
            currentScene.player.currentTarget = false;
            this.uiSceneManager.hideUiTargetElement();
        }
        this.eventsManager.emit('reldens.gameEngineClearTarget', this, clearedTargetData);
    }

    setupSelectTargetOnTabKeyDown(sceneDynamic)
    {
        // TODO: *PHASER* This call must be done on the SceneDriver not on the Phaser's scene.
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

    startUiScene()
    {
        this.startScene(UiSceneManager.UI_SCENE_KEY);
    }

    stopUiScene() {
        this.stopScene(UiSceneManager.UI_SCENE_KEY);
    }

    startScene(scene)
    {
        this.engineDriver.startScene(scene);
    }

    stopScene(scene)
    {
        this.engineDriver.stopScene(scene);
    }

    hasSceneLoaded(sceneName)
    {
        return !!this.getScene(sceneName);
    }

    instantiateSceneDriver(config)
    {
        return this.engineDriver.createNewSceneDriver(config);
    }

}

module.exports.GameEngine = GameEngine;
