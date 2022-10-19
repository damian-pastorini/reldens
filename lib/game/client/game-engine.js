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
const {PlayerEngine} = require("../../users/client/player-engine");
const {ScenePreloader} = require("./scene-preloader");

class GameEngine
{

    constructor(props)
    {
        // super(props.config);
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
        this.roomEventsOnSceneCompleteLoad = undefined;
        this.sceneData = undefined;
        this.activeSceneName = undefined;
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
            getActiveSceneCallback: (() => this.getActiveScene()),
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

    async start(player, room, previousScene)
    {

        if (!this.isUiSceneLoaded) {
            this.loadUiScene(player, room, previousScene);
        } else {
            await this.startEngine(player, room, previousScene);
        }
    }

    loadUiScene(player, room, previousScene)
    {
        this.addScene(UiSceneManager.UI_SCENE_KEY, this.uiSceneManager.uiSceneDriver.scene, true);
        this.uiSceneManager.uiSceneDriver.loadOn('complete', async () => {
            this.isUiSceneLoaded = true;
            this.uiSceneManager.showPlayerName(this.gameManager.playerData.name);
            await this.startEngine(player, room, previousScene);
        });
    }

    async startEngine(player, room, previousScene)
    {
        let preloaderName = GameConst.SCENE_PRELOADER + this.sceneData.roomName;
        if (this.hasSceneLoaded(preloaderName)) {
            await this.createEngineOnScene(preloaderName, player, room, previousScene);
        } else {
            await this.createPreloaderAndScene(preloaderName, player, room, previousScene);
        }
    }

    async createEngineOnScene(preloaderName, player, room, previousScene)
    {
        let currentScene = this.getScene(this.activeSceneName);
        currentScene.objectsAnimationsData = this.sceneData.objectsAnimationsData;
        this.scenePreloader = this.getScene(preloaderName);
        await this.eventsManager.emit('reldens.createdPreloaderRecurring', this, this.scenePreloader);
        await this.createEngineScene(player, room, previousScene);
    }

    async createPreloaderAndScene(preloaderName, player, room, previousScene)
    {
        this.scenePreloader = this.createPreloaderInstance(preloaderName);
        let sceneDriver = this.scenePreloader.sceneDriver;
        this.addScene(preloaderName, sceneDriver.scene, true);
        await this.eventsManager.emit('reldens.createdPreloaderInstance', this, this.scenePreloader);
        sceneDriver.loadOn('complete', async () => {
            this.scenePreloader.sceneDriver.setVisible(true, UiSceneManager.UI_SCENE_KEY);
            await this.createEngineScene(player, room, previousScene);
        });
    }

    async createEngineScene(player, room, previousScene)
    {
        // this event happens once for every scene:
        await this.eventsManager.emit('reldens.createEngineScene', player, room, previousScene, this);

        if (this.gameManager.room) {
            await this.destroyPreviousScene(previousScene);
        }

        const sceneKey = player.state.scene;
        this.startScene(sceneKey);
        this.gameManager.room = room;
        let currentScene = this.getScene(sceneKey);
        currentScene.player = this.createPlayerEngineInstance(currentScene, player, this.gameManager, room);
        currentScene.player.create();
        this.addExistentPlayers(room, currentScene);
        this.uiSceneManager.updateSceneLabel(this.sceneData.roomTitle);

        currentScene.load.on('complete', () => this.roomEventsOnSceneCompleteLoad(currentScene, previousScene));
    }

    addExistentPlayers(room, currentScene)
    {
        if(0 === this.playersCountFromState(room)){
            return false;
        }
        for(let i of this.playersKeysFromState(room)){
            let tmp = room.state.players.get(i);
            if(!tmp.sessionId || tmp.sessionId === room.sessionId){
                continue;
            }
            let addPlayerData = {
                x: tmp.state.x,
                y: tmp.state.y,
                dir: tmp.state.dir,
                playerName: tmp.playerName,
                playedTime: tmp.playedTime,
                avatarKey: tmp.avatarKey
            };
            currentScene.player.addPlayer(tmp.sessionId, addPlayerData);
        }
    }

    playerByIdFromState(room, i)
    {
        return room.state.players.get(i);
    }

    playersCountFromState(room)
    {
        return room.state.players.size;
    }

    playersKeysFromState(room)
    {
        return Array.from(room.state.players.keys());
    }

    async destroyPreviousScene(previousScene)
    {
        if (!previousScene || !this.getScene(previousScene)) {
            return false;
        }
        // destroy previous scene tile set:
        await this.getScene(previousScene).changeScene();
        // stop the previous scene and start the new one:
        this.stopScene(previousScene);
    }

    createPlayerEngineInstance(currentScene, player, gameManager, room)
    {
        return new PlayerEngine({scene: currentScene, playerData: player, gameManager, room});
    }

    createPreloaderInstance(preloaderName)
    {
        return new ScenePreloader({
            map: this.sceneData.roomMap,
            images: this.sceneData.sceneImages,
            configManager: this.gameManager.config,
            getActiveSceneCallback: (() => this.gameManager.getActiveScene()),
            sceneDriver: this.gameManager.gameEngine.instantiateSceneDriver(preloaderName),
            uiSceneManager: this.gameManager.gameEngine.uiSceneManager,
            eventsManager: this.gameManager.events,
            preloadAssets: this.sceneData.preloadAssets,
            objectsAnimationsData: this.sceneData.objectsAnimationsData
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

    setSceneData(sceneData)
    {
        this.sceneData = sceneData;
    }

    setActiveSceneName(sceneName)
    {
        this.activeSceneName = sceneName;
    }

    getActiveScene()
    {
        return this.getScene(this.activeSceneName);
    }
}

module.exports.GameEngine = GameEngine;
