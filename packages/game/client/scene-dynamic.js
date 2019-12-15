const { Scene, Input } = require('phaser');
const { TilesetAnimation } = require('./tileset-animation');
const { EventsManager } = require('../../game/events-manager');

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
        EventsManager.emit('reldens.beforeSceneDynamicCreate', this);
        this.keyLeft = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.LEFT);
        this.keyRight = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.RIGHT);
        this.keyUp = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.UP);
        this.keyDown = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.DOWN);
        this.input.keyboard.on('keydown', (event) => {
            if(event.keyCode === 32 && document.activeElement.tagName.toLowerCase() !== 'input'){
                this.player.runActions();
            }
            if(event.keyCode === 27){
                this.gameManager.gameEngine.clearTarget();
            }
        });
        this.map = this.add.tilemap(this.params.roomMap);
        this.useTsAnimation = this.hasTsAnimation();
        this.tileset = this.map.addTilesetImage(this.params.roomMap);
        this.registerLayers();
        for(let layerIndex in this.layers){
            let layer = this.layers[layerIndex];
            if(layer.layer.name.indexOf('animations') !== -1){
                this.registerTilesetAnimation(layer);
            }
        }
        this.cameras.main.on('camerafadeincomplete', () => {
            this.transition = false;
            this.input.keyboard.on('keyup', (event) => {
                if(event.keyCode >= 37 && event.keyCode <= 40){
                    // @NOTE: all keyup events has to be sent.
                    this.player.stop();
                }
            });
        });
        EventsManager.emit('reldens.afterSceneDynamicCreate', this);
    }

    // eslint-disable-next-line no-unused-vars
    update(time, delta)
    {
        if(this.transition === false){
            if(this.keyLeft.isDown){
                this.player.left();
            } else if(this.keyRight.isDown){
                this.player.right();
            } else if(this.keyUp.isDown){
                this.player.up();
            } else if(this.keyDown.isDown){
                this.player.down();
            }
        }
    }

    changeScene()
    {
        this.objectsAnimations = {};
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

}

module.exports.SceneDynamic = SceneDynamic;
