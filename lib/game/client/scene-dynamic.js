/**
 *
 * Reldens - SceneDynamic
 *
 */

const { Scene, Input } = require('phaser');
const { TileSetAnimation } = require('./tileset-animation');
const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../constants');
const { Minimap } = require('./minimap');

class SceneDynamic extends Scene
{

    constructor(key, data, gameManager)
    {
        super({key});
        this.key = key;
        this.params = data;
        this.gameManager = gameManager;
        this.configManager = gameManager.config;
        this.layers = {};
        this.transition = true;
        this.useTsAnimation = false;
        this.arrowSprite = false;
        this.objectsAnimationsData = false;
        this.objectsAnimations = {};
        this.configuredFrameRate = this.gameManager.config.get('client/general/animations/frameRate') || 10;
        let minimapConfig = this.gameManager.config.get('client/ui/minimap');
        this.minimap = minimapConfig.enabled ? this.createMinimapInstance(minimapConfig) : false;
    }

    createMinimapInstance(config)
    {
        return new Minimap({config, events: this.gameManager.events});
    }

    init()
    {
        this.scene.setVisible(false, this.key);
        this.input.keyboard.removeAllListeners();
    }

    create()
    {
        this.gameManager.events.emitSync('reldens.beforeSceneDynamicCreate', this);
        this.createControllerKeys();
        this.input.keyboard.on('keydown', (event) => {
            return this.executeKeyDownBehavior(event);
        });
        this.map = this.add.tilemap(this.params.roomMap);
        this.disableContextMenu();
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            return this.executePointerDownAction(pointer, currentlyOver);
        });
        this.createSceneMap();
        this.cameras.main.on('camerafadeincomplete', () => {
            this.transition = false;
            this.gameManager.isChangingScene = false;
            this.input.keyboard.on('keyup', (event) => {
                this.executeKeyUpBehavior(event);
            });
            this.gameManager.gameDom.activeElement().blur();
            this.minimap.createMap(this, this.gameManager.getCurrentPlayerAnimation());
        });
        this.gameManager.events.emitSync('reldens.afterSceneDynamicCreate', this);
    }

    createSceneMap()
    {
        this.useTsAnimation = this.hasTsAnimation();
        this.tileset = this.map.addTilesetImage(this.params.roomMap);
        this.registerLayers();
        for(let i of Object.keys(this.layers)){
            let layer = this.layers[i];
            if(-1 !== layer.layer.name.indexOf('animations')){
                this.registerTilesetAnimation(layer);
            }
        }
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

    executeKeyDownBehavior(event)
    {
        if (this.gameManager.gameDom.insideInput()) {
            return false;
        }
        // @TODO - BETA - Make configurable the keys related to the actions and skills.
        // keyCode = 32 > space bar
        if (event.keyCode === 32 && !this.gameManager.gameDom.insideInput()) {
            this.player.runActions();
        }
        // keyCode = 27 > esc
        if (event.keyCode === 27) {
            this.gameManager.gameEngine.clearTarget();
        }
        // keyCode = 116 > F5
        if (event.keyCode === 116) {
            this.gameManager.forcedDisconnection = true;
        }
    }

    executeKeyUpBehavior(event)
    {
        // stop all directional keys (arrows and wasd):
        if(event.keyCode >= 37 && event.keyCode <= 40 || (
            event.keyCode === 87
            || event.keyCode === 65
            || event.keyCode === 83
            || event.keyCode === 68
        )){
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
        let keys = [
            Input.Keyboard.KeyCodes.LEFT,
            Input.Keyboard.KeyCodes.A,
            Input.Keyboard.KeyCodes.RIGHT,
            Input.Keyboard.KeyCodes.D,
            Input.Keyboard.KeyCodes.UP,
            Input.Keyboard.KeyCodes.W,
            Input.Keyboard.KeyCodes.DOWN,
            Input.Keyboard.KeyCodes.S
        ];
        let inputElements = this.gameManager.gameDom.getElements('input');
        for(let inputElement of inputElements){
            this.loopKeysAddListenerToElement(keys, inputElement, 'focusin', 'removeCapture');
            this.loopKeysAddListenerToElement(keys, inputElement, 'click', 'removeCapture');
            this.loopKeysAddListenerToElement(keys, inputElement, 'focusout', 'addCapture');
            this.loopKeysAddListenerToElement(keys, inputElement, 'blur', 'addCapture');
        }
    }

    executePointerDownAction(pointer, currentlyOver)
    {
        let primaryMove = this.gameManager.config.get('client/ui/controls/primaryMove');
        if ((!pointer.primaryDown && primaryMove) || (pointer.primaryDown && !primaryMove)) {
            return false;
        }
        // @TODO - BETA - Temporal avoid double actions, if you target something you will not be moved to the
        //   pointer, in a future release this will be configurable so you can walk to objects and they get
        //   activated, for example, click on and NPC, automatically walk close and automatically get a dialog
        //   opened.
        if (this.gameManager.gameDom.insideInput()) {
            this.gameManager.gameDom.activeElement().blur();
        }
        if (currentlyOver.length) {
            return false;
        }
        if (!this.appendRowAndColumn(pointer)) {
            return false;
        }
        if (!this.gameManager.config.get('client/players/tapMovement/enabled')) {
            return false;
        }
        this.player.moveToPointer(pointer);
        this.updatePointerObject(pointer);
    }

    // eslint-disable-next-line no-unused-vars
    update(time, delta)
    {
        if(this.gameManager.gameDom.insideInput()){
            return true;
        }
        if(this.transition === false && !this.gameManager.isChangingScene){
            // @TODO - BETA - Controllers will be part of the configuration in the database.
            if(this.keyLeft.isDown || this.keyA.isDown){
                this.player.left();
            } else if(this.keyRight.isDown || this.keyD.isDown){
                this.player.right();
            }
            if(this.keyUp.isDown || this.keyW.isDown){
                this.player.up();
            } else if(this.keyDown.isDown || this.keyS.isDown){
                this.player.down();
            }
        }
    }

    async changeScene()
    {
        await this.gameManager.events.emit('reldens.changeSceneDestroyPrevious', this);
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
            if(layer.name.indexOf('animations') !== -1){
                result = true;
                break;
            }
        }
        return result;
    }

    registerLayers()
    {
        let idx = 0;
        for(let layer of this.map.layers){
            let margin = this.configManager.get('client/map/tileData/margin');
            let spacing = this.configManager.get('client/map/tileData/spacing');
            let layerName = layer.name;
            if(this.useTsAnimation){
                this.layers[idx] = this.map.createLayer(layerName, this.tileset, margin, spacing);
            } else {
                this.layers[idx] = this.map.createLayer(layerName, this.tileset, margin, spacing);
            }
            if(layerName.indexOf('below-player') !== -1){
                this.layers[idx].setDepth(this.configManager.get('client/map/layersDepth/belowPlayer'));
            }
            if(layerName.indexOf('over-player') !== -1){
                // we need to set the depth higher than everything else (multiply to get the highest value):
                this.layers[idx].setDepth(idx * this.map.height * this.map.tileHeight);
            }
            if(layerName.indexOf('change-points') !== -1){
                this.layers[idx].setDepth(this.configManager.get('client/map/layersDepth/changePoints'));
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
        // @TODO - BETA - Replace by constants.
        // objKey = t > target
        // objKey = o > owner
        let returnObj = false;
        if(extraData[objKey+'T'] !== 'p' && sc.hasOwn(this.objectsAnimations, extraData[objKey+'K'])){
            returnObj = this.objectsAnimations[extraData[objKey+'K']];
        }
        if(extraData[objKey+'T'] === 'p' && sc.hasOwn(currentPlayer.players, extraData[objKey+'K'])){
            returnObj = currentPlayer.players[extraData[objKey+'K']];
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
