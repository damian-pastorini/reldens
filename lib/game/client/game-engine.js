/**
 *
 * Reldens - GameEngine
 *
 * Extends Phaser's Game class to provide the core game rendering engine for Reldens client.
 * Manages UI scenes, template rendering (Mustache), screen resizing, camera handling, target
 * selection (TAB key), FPS counter, and game size updates. Handles UI element positioning,
 * small map centering, and coordinates with GameManager for active scene management. Listens
 * to events for reconnection and scene creation.
 *
 */

const TemplateEngineRender = require('mustache');
const { Game, Input } = require('phaser');
const { FPSCounter } = require('./fps-counter');
const { GameConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('phaser').Scene} Scene
 * @typedef {import('./scene-dynamic').SceneDynamic} SceneDynamic
 * @typedef {import('../../users/client/player').Player} Player
 * @typedef {object} GameEngineProps
 * @property {object} config
 * @property {EventsManager} events
 * @typedef {object} ScreenSizeData
 * @property {number} newWidth
 * @property {number} newHeight
 * @property {number} containerWidth
 * @property {number} containerHeight
 * @property {number} mapWidth
 * @property {number} mapHeight
 * @property {SceneDynamic} activeScene
 */
class GameEngine extends Game
{

    /**
     * @param {GameEngineProps} props
     */
    constructor(props)
    {
        super(props.config);
        Logger.debug('Game Engine configuration.', props.config);
        /** @type {Scene|false} */
        this.uiScene = false;
        /** @type {object} */
        this.TemplateEngine = TemplateEngineRender;
        /** @type {EventsManager} */
        this.eventsManager = props.events;
        this.eventsManager.on('reldens.beforeReconnectGameClient', () => {
            this.clearTarget();
        });
        this.eventsManager.on('reldens.beforeSceneDynamicCreate', (sceneDynamic) => {
            this.setupTabTarget(sceneDynamic);
        });
        /** @type {FPSCounter|undefined} */
        this.fpsCounter = undefined;
    }

    /**
     * @param {string} template
     * @param {object} view
     * @param {object} [partials]
     * @param {string[]} [tags]
     * @returns {string}
     */
    parseTemplate(template, view, partials, tags)
    {
        return this.TemplateEngine.render(template, view, partials, tags);
    }

    /**
     * @param {GameManager} manager
     */
    updateGameSize(manager)
    {
        let {newWidth, newHeight, mapWidth, mapHeight, activeScene} = this.getCurrentScreenSize(manager);
        let player = activeScene.player;
        if(player){
            // automatically fix the camera position to the player:
            activeScene.cameras.main.setLerp(player.cameraInterpolationX, player.cameraInterpolationY);
        }
        setTimeout(() => {
            this.eventsManager.emit('reldens.updateGameSizeBefore', this, newWidth, newHeight);
            if(manager.config.getWithoutLogs('client/ui/screen/updateGameSizeEnabled', false)) {
                this.scale.setGameSize(newWidth, newHeight);
            }
            this.centerSmallMapsCamera(manager, activeScene, newWidth, mapWidth, newHeight, mapHeight);
            for(let key of Object.keys(this.uiScene.elementsUi)){
                let uiElement = this.uiScene.elementsUi[key];
                let positionKey = sc.get(this.uiScene.userInterfaces[key], 'uiPositionKey', key);
                let {uiX, uiY} = this.uiScene.getUiConfig(positionKey, newWidth, newHeight);
                uiElement.x = uiX;
                uiElement.y = uiY;
            }
            this.eventsManager.emit('reldens.updateGameSizeAfter', this, newWidth, newHeight);
            if(player){
                // restore camera movement:
                activeScene.cameras.main.setLerp(player.cameraInterpolationX, player.cameraInterpolationY);
            }
        }, manager.config.getWithoutLogs('client/general/gameEngine/updateGameSizeTimeOut', 0));
    }

    /**
     * @param {GameManager} manager
     * @returns {ScreenSizeData}
     */
    getCurrentScreenSize(manager)
    {
        let gameContainer = manager.gameDom.getElement(GameConst.SELECTORS.GAME_CONTAINER);
        let containerWidth = gameContainer.offsetWidth;
        let containerHeight = gameContainer.offsetHeight;
        let newWidth = containerWidth;
        let newHeight = containerHeight;
        let mapWidth = 0, mapHeight = 0;
        let activeScene = manager.getActiveScene();
        if(activeScene){
            let activeSceneMap = activeScene.map;
            if(activeSceneMap){
                mapWidth = activeSceneMap.width * activeSceneMap.tileWidth;
                mapHeight = activeSceneMap.height * activeSceneMap.tileHeight;
                if(
                    manager.config.getWithoutLogs('client/ui/screen/adjustUiElementsToMapSize', false)
                    && 0 < mapWidth
                    && 0 < mapHeight
                ){
                    newWidth = Math.min(containerWidth, mapWidth);
                    newHeight = Math.min(containerHeight, mapHeight);
                }
            }
        }
        if(manager.config.getWithoutLogs('client/ui/maximum/enabled', true)){
            let maxUiW = Number(manager.config.get('client/ui/maximum/x'));
            newWidth = Math.min(newWidth, maxUiW);
            let maxUiY = Number(manager.config.get('client/ui/maximum/y'));
            newHeight = Math.min(newHeight, maxUiY);
        }
        return {newWidth, newHeight, containerWidth, containerHeight, mapWidth, mapHeight, activeScene};
    }

    /**
     * @param {GameManager} manager
     * @param {SceneDynamic} activeScene
     * @param {number} newWidth
     * @param {number} mapWidth
     * @param {number} newHeight
     * @param {number} mapHeight
     */
    centerSmallMapsCamera(manager, activeScene, newWidth, mapWidth, newHeight, mapHeight)
    {
        if(!manager.config.getWithoutLogs('client/ui/screen/centerSmallMapsCamera', true) || !activeScene){
            return;
        }
        let cameraX = 0;
        let cameraY = 0;
        if (newWidth > mapWidth) {
            cameraX = (newWidth - mapWidth) / 2;
        }
        if (newHeight > mapHeight) {
            cameraY = (newHeight - mapHeight) / 2;
        }
        activeScene.cameras.main.setPosition(cameraX, cameraY);
    }

    /**
     * @param {string} targetName
     * @param {object} target
     * @param {object} [previousTarget]
     */
    showTarget(targetName, target, previousTarget)
    {
        if(sc.hasOwn(this.uiScene, 'uiTarget')){
            this.uiScene.uiTarget.getChildByID('box-target').style.display = 'block';
            this.uiScene.uiTarget.getChildByID('target-container').innerHTML = this.targetDisplay(targetName, target);
        }
        this.eventsManager.emit('reldens.gameEngineShowTarget', this, target, previousTarget, targetName);
    }

    /**
     * @param {string} targetName
     * @param {object} target
     * @returns {string}
     */
    targetDisplay(targetName, target)
    {
        let targetDisplayContent = targetName;
        if(GameConst.TYPE_PLAYER === target.type){
            targetDisplayContent += this.generateTargetPlayedTime(target);
        }
        return targetDisplayContent;
    }

    /**
     * @param {object} target
     * @returns {string}
     */
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

    /**
     * @param {number} playedTime
     * @returns {string}
     */
    createPlayedTimeLabel(playedTime)
    {
        let htmlElement = this.uiScene.gameManager.gameDom.createElement('p');
        htmlElement.innerHTML = this.uiScene.gameManager.config.get('client/players/playedTime/label').replace(
            '%playedTimeInHs',
            playedTime
        );
        return htmlElement.outerHTML;
    }

    /**
     * @param {object} target
     * @param {Player} currentPlayer
     * @returns {number}
     */
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

    /**
     * @param {SceneDynamic} sceneDynamic
     */
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
