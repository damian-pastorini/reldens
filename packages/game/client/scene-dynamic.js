/**
 *
 * Reldens - SceneDynamic
 *
 */

const { Scene, Input } = require('phaser');
const { TilesetAnimation } = require('./tileset-animation');
const { EventsManagerSingleton } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

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
        // this will contain the animations data coming from the server:
        this.objectsAnimationsData = false;
        // this will contain the animations objects instances:
        this.objectsAnimations = {};
        // frame rate:
        this.configuredFrameRate = this.gameManager.config.get('client/general/animations/frameRate') || 10;
    }

    init()
    {
        this.scene.setVisible(false, this.key);
        this.input.keyboard.removeAllListeners();
    }

    create()
    {
        EventsManagerSingleton.emit('reldens.beforeSceneDynamicCreate', this);
        // @TODO - BETA.17: controllers will be part of the configuration in the database.
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
        this.gameManager.gameDom.getElement('input').on('focus', () => {
            for(let keyCode of keys){
                this.input.keyboard.removeCapture(keyCode);
            }
        });
        this.gameManager.gameDom.getElement('input').on('blur', () => {
            for(let keyCode of keys) {
                this.input.keyboard.addCapture(keyCode);
            }
        });
        this.input.keyboard.on('keydown', (event) => {
            // @TODO - BETA.17: make configurable the keys related to the actions and skills.
            if(event.keyCode === 32 && !this.gameManager.gameDom.insideInput()){
                this.player.runActions();
            }
            if(event.keyCode === 27){
                this.gameManager.gameEngine.clearTarget();
            }
        });
        this.map = this.add.tilemap(this.params.roomMap);
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            // @TODO - BETA.17: temporal avoid double actions, if you target something you will not be moved to the
            //   pointer, in a future release this will be configurable so you can walk to objects and they get
            //   activated, for example, click on and NPC, automatically walk close and automatically get a dialog
            //   opened.
            if(this.gameManager.gameDom.insideInput()){
                this.gameManager.gameDom.activeElement().blur();
            }
            if(!currentlyOver.length){
                this.appendRowAndColumn(pointer);
                this.player.moveToPointer(pointer);
                this.updatePointerObject(pointer);
            }
        });
        this.useTsAnimation = this.hasTsAnimation();
        this.tileset = this.map.addTilesetImage(this.params.roomMap);
        this.registerLayers();
        for(let i of Object.keys(this.layers)){
            let layer = this.layers[i];
            if(layer.layer.name.indexOf('animations') !== -1){
                this.registerTilesetAnimation(layer);
            }
        }
        this.cameras.main.on('camerafadeincomplete', () => {
            this.transition = false;
            this.gameManager.isChangingScene = false;
            this.input.keyboard.on('keyup', (event) => {
                // stop all directional keys:
                if(event.keyCode >= 37 && event.keyCode <= 40 || (
                    event.keyCode === 87
                    || event.keyCode === 65
                    || event.keyCode === 83
                    || event.keyCode === 68
                )){
                    // @NOTE: all keyup events has to be sent.
                    this.player.stop();
                }
            });
        });
        EventsManagerSingleton.emit('reldens.afterSceneDynamicCreate', this);
    }

    // eslint-disable-next-line no-unused-vars
    update(time, delta)
    {
        if(this.gameManager.gameDom.insideInput()){
            return true;
        }
        if(this.transition === false && !this.gameManager.isChangingScene){
            // @TODO - BETA.17: controllers will be part of the configuration in the database.
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

    changeScene()
    {
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
            let margin = this.configManager.get('client/general/tileData/margin');
            let spacing = this.configManager.get('client/general/tileData/spacing');
            let layerName = layer.name;
            if(this.useTsAnimation){
                this.layers[idx] = this.map.createDynamicLayer(layerName, this.tileset, margin, spacing);
            } else {
                this.layers[idx] = this.map.createStaticLayer(layerName, this.tileset, margin, spacing);
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
        this.tilesetAnimation = new TilesetAnimation();
        this.tilesetAnimation.register(layer, this.tileset.tileData);
        this.tilesetAnimation.start();
    }

    appendRowAndColumn(pointer)
    {
        let tW = this.map.tileWidth;
        let tH = this.map.tileHeight;
        // @TODO - BETA.17: this is a temporal fix, we need to make configurable the player body and take it into
        //   account for the path finder calculations. Between the configurations we need to include one to affect the
        //   body size in the server, for now all the bodies get the same tile size. See related issue #54.
        let column = Math.round(pointer.worldX / tW);
        let row = Math.round(pointer.worldY / tH);
        pointer.worldColumn = column;
        pointer.worldRow = row;
    }

    updatePointerObject(pointer)
    {
        if(!this.configManager.get('client/ui/pointer/show')){
            return;
        }
        if(this.arrowSprite){
            this.arrowSprite.destroy();
        }
        this.arrowSprite = this.physics.add.sprite(pointer.worldX, pointer.worldY, GameConst.ARROW_DOWN);
        this.arrowSprite.setDepth(2000000);
        this.arrowSprite.anims.play(GameConst.ARROW_DOWN, true).on('animationcomplete', () => {
            this.arrowSprite.destroy();
        });
    }

}

module.exports.SceneDynamic = SceneDynamic;
