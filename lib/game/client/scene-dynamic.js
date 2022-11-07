/**
 *
 * Reldens - SceneDynamic
 *
 */

const { Scene, Input } = require('phaser');
const { TileSetAnimation } = require('./tileset-animation');
const { Minimap } = require('./minimap');
const { GameConst } = require('../constants');
const { ActionsConst } = require('../../actions/constants');
const { Logger, sc } = require('@reldens/utils');

class SceneDynamic extends Scene
{

    constructor(key, data, gameManager)
    {
        super({key});
        this.key = key;
        this.params = data;
        this.gameManager = gameManager;
        this.eventsManager = gameManager.events;
        this.configManager = gameManager.config;
        this.layers = {};
        this.transition = true;
        this.useTsAnimation = false;
        this.arrowSprite = false;
        this.objectsAnimationsData = false;
        this.objectsAnimations = {};
        this.configuredFrameRate = this.gameManager.config.get('client/general/animations/frameRate') || 10;
        this.clientInterpolation = this.gameManager.config.get('client/general/engine/clientInterpolation');
        this.interpolationSpeed = this.gameManager.config.get('client/general/engine/interpolationSpeed') || 0.5;
        this.minimapConfig = this.gameManager.config.get('client/ui/minimap');
        this.minimap = this.minimapConfig.enabled ? this.createMinimapInstance(this.minimapConfig) : false;
        this.player = false;
        this.interpolatePlayersPosition = {};
        this.interpolateObjectsPositions = {};
    }

    createMinimapInstance(config)
    {
        return new Minimap({config, events: this.eventsManager});
    }

    init()
    {
        this.scene.setVisible(false, this.key);
        this.input.keyboard.removeAllListeners();
    }

    async create()
    {
        this.eventsManager.emitSync('reldens.beforeSceneDynamicCreate', this);
        this.disableContextMenu();
        this.createControllerKeys();
        this.setupKeyboardAndPointerEvents();
        await this.createSceneMap();

        // TODO: *PHASER* This call must be done on the SceneDriver not on the Phaser's scene.
        this.cameras.main.on('camerafadeincomplete', () => {
            this.transition = false;
            this.gameManager.isChangingScene = false;
            this.gameManager.gameDom.activeElement().blur();
            this.minimap.createMap(this, this.gameManager.getCurrentPlayerAnimation());
        });
        this.eventsManager.emitSync('reldens.afterSceneDynamicCreate', this);
    }

    // eslint-disable-next-line no-unused-vars
    update(time, delta)
    {
        this.interpolatePositions();
        this.movePlayerByPressedButtons();
    }

    disableContextMenu()
    {
        if(!this.gameManager.config.get('client/ui/controls/disableContextMenu')){
            return false;
        }
        this.gameManager.gameDom.getDocument().addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    setupKeyboardAndPointerEvents()
    {
        this.input.keyboard.on('keydown', (event) => {
            return this.executeKeyDownBehavior(event);
        });
        this.input.keyboard.on('keyup', (event) => {
            this.executeKeyUpBehavior(event);
        });
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            return this.executePointerDownAction(pointer, currentlyOver);
        });
    }

    async createSceneMap()
    {
        this.map = this.add.tilemap(this.params.roomMap);
        this.useTsAnimation = this.hasTsAnimation();
        this.tileset = this.map.addTilesetImage(this.params.roomMap);
        this.registerLayers();
        this.registerLayersTileAnimations();
    }

    registerLayersTileAnimations()
    {
        let layersKeys = Object.keys(this.layers);
        if(0 === layersKeys.length){
            return;
        }
        for(let i of layersKeys){
            let layer = this.layers[i];
            if(-1 === layer.layer.name.indexOf('animations')){
                continue;
            }
            this.registerTilesetAnimation(layer);
        }
    }

    executeKeyDownBehavior(event)
    {
        if(this.gameManager.gameDom.insideInput()){
            return false;
        }
        // @TODO - BETA - Make configurable the keys related to the actions and skills.
        if(Input.Keyboard.KeyCodes.SPACE === event.keyCode && !this.gameManager.gameDom.insideInput()){
            if(!this.player){
                return;
            }
            this.player.runActions();
        }
        if(Input.Keyboard.KeyCodes.ESC === event.keyCode){
            this.gameManager.gameEngine.clearTarget();
        }
        if(Input.Keyboard.KeyCodes.F5 === event.keyCode){
            this.gameManager.forcedDisconnection = true;
        }
    }

    executeKeyUpBehavior(event)
    {
        if(!this.player){
            return;
        }
        // stop all directional keys (arrows and wasd):
        let keys = this.availableControllersKeyCodes();
        if(-1 !== keys.indexOf(event.keyCode)){
            // @NOTE: all keyup events has to be sent.
            this.player.stop();
        }
    }

    createControllerKeys()
    {
        // @TODO - BETA - Controllers will be part of the configuration in the database.
        this.keyLeft = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.LEFT);
        this.keyA = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.A);
        this.keyRight = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.RIGHT);
        this.keyD = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.D);
        this.keyUp = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.UP);
        this.keyW = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.W);
        this.keyDown = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.DOWN);
        this.keyS = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.S);
        let keys = this.availableControllersKeyCodes();
        let inputElements = this.gameManager.gameDom.getElements('input');
        for(let inputElement of inputElements){
            this.loopKeysAddListenerToElement(keys, inputElement, 'focusin', 'removeCapture');
            this.loopKeysAddListenerToElement(keys, inputElement, 'click', 'removeCapture');
            this.loopKeysAddListenerToElement(keys, inputElement, 'focusout', 'addCapture');
            this.loopKeysAddListenerToElement(keys, inputElement, 'blur', 'addCapture');
        }
    }

    availableControllersKeyCodes()
    {
        return [
            Input.Keyboard.KeyCodes.LEFT,
            Input.Keyboard.KeyCodes.A,
            Input.Keyboard.KeyCodes.RIGHT,
            Input.Keyboard.KeyCodes.D,
            Input.Keyboard.KeyCodes.UP,
            Input.Keyboard.KeyCodes.W,
            Input.Keyboard.KeyCodes.DOWN,
            Input.Keyboard.KeyCodes.S
        ];
    }

    executePointerDownAction(pointer, currentlyOver)
    {
        let primaryMove = this.gameManager.config.get('client/ui/controls/primaryMove');
        if((!pointer.primaryDown && primaryMove) || (pointer.primaryDown && !primaryMove)){
            return false;
        }
        // @TODO - BETA - Temporal avoid double actions, if you target something you will not be moved to the
        //   pointer, in a future release this will be configurable so you can walk to objects and they get
        //   activated, for example, click on and NPC, automatically walk close and automatically get a dialog
        //   opened.
        if(this.gameManager.gameDom.insideInput()){
            this.gameManager.gameDom.activeElement().blur();
        }
        if(currentlyOver.length){
            return false;
        }
        if(!this.appendRowAndColumn(pointer)){
            return false;
        }
        if(
            !this.gameManager.config.get('client/players/tapMovement/enabled')
            || this.gameManager.activeRoomEvents.sceneData?.worldConfig?.applyGravity
        ){
            return false;
        }
        this.player.moveToPointer(pointer);
        this.updatePointerObject(pointer);
    }

    movePlayerByPressedButtons()
    {
        // if player is writing there's no movement:
        if(this.gameManager.gameDom.insideInput()){
            return;
        }
        if(this.transition || this.gameManager.isChangingScene){
            return;
        }
        // @TODO - BETA - Controllers will be part of the configuration in the database.
        if(this.keyRight.isDown || this.keyD.isDown){
            this.player.right();
        }
        if(this.keyLeft.isDown || this.keyA.isDown){
            this.player.left();
        }
        if(this.keyDown.isDown || this.keyS.isDown){
            this.player.down();
        }
        if(this.keyUp.isDown || this.keyW.isDown){
            this.player.up();
        }
    }

    interpolatePositions()
    {
        if(!this.clientInterpolation){
            return;
        }
        this.processPlayersPositionInterpolation();
        this.processObjectsPositionInterpolation();
    }

    processPlayersPositionInterpolation()
    {
        let playerKeys = Object.keys(this.interpolatePlayersPosition);
        if(0 === playerKeys.length){
            return;
        }
        for(let i of playerKeys){
            if(!this.player){
                break;
            }
            let entityState = this.interpolatePlayersPosition[i];
            let entity = this.player.players[i];
            if(!entity){
                continue;
            }
            if(entity.x === entityState.x && entity.y === entityState.y){
                continue;
            }
            let newX = Phaser.Math.Linear(entity.x, (entityState.x - this.player.leftOff), this.interpolationSpeed);
            let newY = Phaser.Math.Linear(entity.y, (entityState.y - this.player.topOff), this.interpolationSpeed);
            this.player.updateSpritePosition(entity, newX, newY);
            this.player.playPlayerAnimation(entity, Object.assign({}, entityState, {x: newX, y: newY}));
            this.player.stopPlayerAnimation(entity, entityState);
            this.player.updatePlayerState(entity, entity, i);
            delete this.interpolatePlayersPosition[i];
        }
    }

    processObjectsPositionInterpolation()
    {
        let objectsKeys = Object.keys(this.interpolateObjectsPositions);
        if(0 === objectsKeys.length){
            return;
        }
        let objectsPlugin = this.gameManager.getFeature('objects');
        for(let i of objectsKeys){
            let entityState = this.interpolateObjectsPositions[i];
            this.interpolateBulletPosition(i, entityState, objectsPlugin);
            this.interpolateObjectAnimationPosition(i, entityState, objectsPlugin);
        }
    }

    interpolateBulletPosition(i, entityState, objectsPlugin)
    {
        let isBullet = -1 !== i.indexOf('bullet');
        if(!isBullet){
            return;
        }
        let entity = sc.get(objectsPlugin.bullets, i);
        if(!entity){
            return;
        }
        if(this.isCurrentPosition(entity, entityState)){
            return;
        }
        let bodyData = {
            x: Phaser.Math.Linear(entity.x, entityState.x, this.interpolationSpeed),
            y: Phaser.Math.Linear(entity.y, entityState.y, this.interpolationSpeed)
        };
        objectsPlugin.updateBulletBodyPosition(i, bodyData);
        delete this.interpolateObjectsPositions[i];
    }

    interpolateObjectAnimationPosition(i, entityState, objectsPlugin)
    {
        let entity = this.objectsAnimations[i];
        if(!entity){
            return;
        }
        if(this.isCurrentPosition(entity, entityState)){
            return;
        }
        let bodyData = {
            x: Phaser.Math.Linear(entity.x, entityState.x, this.interpolationSpeed),
            y: Phaser.Math.Linear(entity.y, entityState.y, this.interpolationSpeed),
            inState: entityState.inState,
            mov: entityState.mov
        };
        objectsPlugin.updateObjectsAnimations(bodyData, i, this);
        delete this.interpolateObjectsPositions[i];
    }

    isCurrentPosition(entity, entityState)
    {
        if(!entity || !entityState){
            return false;
        }
        return entity.x === entityState.x && entity.y === entityState.y;
    }

    async changeScene()
    {
        this.eventsManager.emitSync('reldens.changeSceneDestroyPrevious', this);
        this.objectsAnimations = {};
        this.objectsAnimationsData = false;
        if(this.useTsAnimation){
            this.tilesetAnimation.destroy();
        }
    }

    hasTsAnimation()
    {
        let result = false;
        for(let layer of this.map.layers){
            if(-1 !== layer.name.indexOf('animations')){
                result = true;
                break;
            }
        }
        return result;
    }

    registerLayers()
    {
        if(0 === this.map.layers.length){
            return;
        }
        let idx = 0;
        let depthBelowPlayer = this.configManager.get('client/map/layersDepth/belowPlayer');
        let depthForChangePoints = this.configManager.get('client/map/layersDepth/changePoints');
        let margin = this.configManager.get('client/map/tileData/margin');
        let spacing = this.configManager.get('client/map/tileData/spacing');
        for(let layer of this.map.layers){
            this.layers[idx] = this.map.createLayer(layer.name, this.tileset, margin, spacing);
            if(!this.layers[idx]){
                Logger.critical('Map layer could not be created.', layer.name, this.key);
                continue;
            }
            if(-1 !== layer.name.indexOf('below-player')){
                this.layers[idx].setDepth(depthBelowPlayer);
            }
            if(-1 !== layer.name.indexOf('over-player')){
                // we need to set the depth higher than everything else (multiply to get the highest value):
                this.layers[idx].setDepth(idx * this.map.height * this.map.tileHeight);
            }
            if(-1 !== layer.name.indexOf('change-points')){
                this.layers[idx].setDepth(depthForChangePoints);
            }
            idx++;
        }
    }

    registerTilesetAnimation(layer)
    {
        this.tilesetAnimation = new TileSetAnimation();
        this.tilesetAnimation.register(layer, this.tileset.tileData);
        this.tilesetAnimation.start();
    }

    appendRowAndColumn(pointer)
    {
        let worldToTileXY = this.map.worldToTileXY(pointer.worldX, pointer.worldY);
        let playerToTileXY = this.map.worldToTileXY(this.player.state.x, this.player.state.y);
        if(!worldToTileXY || !playerToTileXY){
            Logger.error('Move to pointer error.');
            return false;
        }
        pointer.worldColumn = worldToTileXY.x;
        pointer.worldRow = worldToTileXY.y;
        pointer.playerOriginCol = playerToTileXY.x;
        pointer.playerOriginRow = playerToTileXY.y;
        return pointer;
    }

    createFloatingText(
        x,
        y,
        message,
        color,
        font,
        fontSize = 14,
        duration = 600,
        top = 50,
        stroke = '#000000',
        strokeThickness = 4,
        shadowColor = 'rgba(0,0,0,0.7)'
    ){
        let damageSprite = this.add.text(x, y, message, {fontFamily: font, fontSize: fontSize+'px'});
        damageSprite.style.setColor(color);
        damageSprite.style.setAlign('center');
        damageSprite.style.setStroke(stroke, strokeThickness);
        damageSprite.style.setShadow(5, 5, shadowColor, 5);
        damageSprite.setDepth(200000);
        this.add.tween({
            targets: damageSprite, duration, ease: 'Exponential.In', y: y - top,
            onComplete: () => {
                damageSprite.destroy();
            }
        });
    }

    updatePointerObject(pointer)
    {
        if(!this.configManager.get('client/ui/pointer/show')){
            return;
        }
        if(this.arrowSprite){
            this.arrowSprite.destroy();
        }
        let topOffSet = this.configManager.get('client/ui/pointer/topOffSet') || 16;
        this.arrowSprite = this.physics.add.sprite(pointer.worldX, pointer.worldY - topOffSet, GameConst.ARROW_DOWN);
        this.arrowSprite.setDepth(500000);
        this.arrowSprite.anims.play(GameConst.ARROW_DOWN, true).on('animationcomplete', () => {
            this.arrowSprite.destroy();
        });
    }

    getAnimationByKey(key)
    {
        if(!this.anims || !this.anims.anims || !this.anims.anims.entries){
            return false;
        }
        return sc.get(this.anims.anims.entries, key, false);
    }

    getObjectFromExtraData(objKey, extraData, currentPlayer)
    {
        // @TODO - BETA - Replace with constants.
        // objKey = t > target
        // objKey = o > owner
        let returnObj = false;
        let dataTargetType = objKey+'T'; // tT - oT === DATA_TARGET_TYPE - DATA_OWNER_TYPE
        let dataTargetKey = objKey+'K'; // tK - oK === DATA_TARGET_KEY - DATA_OWNER_KEY
        let isTargetPlayer = extraData[dataTargetType] === ActionsConst.DATA_TYPE_VALUE_PLAYER;
        if(!isTargetPlayer && sc.hasOwn(this.objectsAnimations, extraData[dataTargetKey])){
            returnObj = this.objectsAnimations[extraData[dataTargetKey]];
        }
        if(isTargetPlayer && sc.hasOwn(currentPlayer.players, extraData[dataTargetKey])){
            returnObj = currentPlayer.players[extraData[dataTargetKey]];
        }
        return returnObj;
    }

    loopKeysAddListenerToElement(keys, element, eventName, action)
    {
        element.addEventListener(eventName, () => {
            for(let keyCode of keys){
                this.input.keyboard[action](keyCode);
            }
        });
    }

}

module.exports.SceneDynamic = SceneDynamic;
