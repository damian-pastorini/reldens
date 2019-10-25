const Phaser = require('phaser');
const TilesetAnimation = require('./tileset-animation');
const AnimationEngine = require('../objects/animation-engine');

class SceneDynamic extends Phaser.Scene
{

    constructor(key, data, gameManager)
    {
        super({key});
        this.key = key;
        this.params = data;
        this.layers = {};
        this.transition = true;
        this.useTsAnimation = false;
        this.gameManager = gameManager;
        this.configManager = gameManager.config;
        // frame rate:
        this.configuredFrameRate = this.gameManager.config.get('client/general/animations/frameRate') || 10;
        // this will contain the animations data coming from the server:
        this.objectsAnimationsData = false;
        // this will contain the animations objects instances:
        this.objectsAnimations = {};
    }

    init()
    {
        this.scene.setVisible(false, this.key);
        this.input.keyboard.removeAllListeners();
    }

    create()
    {
        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
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
                if (event.keyCode >= 37 && event.keyCode <= 40){
                    // @NOTE: all keyup events has to be sent.
                    this.player.stop();
                }
            });
        });
        // create animations for all the objects in the scene:
        this.createDynamicAnimations();
    }

    createDynamicAnimations()
    {
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        if(currentScene.objectsAnimationsData){
            for(let idx in currentScene.objectsAnimationsData){
                let animProps = currentScene.objectsAnimationsData[idx];
                animProps.frameRate = this.configuredFrameRate;
                // create the animation object instance:
                let animation = new AnimationEngine(this.gameManager, animProps, this);
                // @NOTE: this will populate the objectsAnimations property in the current scene, see scene-dynamic.
                animation.createAnimation();
            }
        }
    }

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
                this.layers[idx].setDepth(idx);
            }
            if(layerName.indexOf('change-points') !== -1){
                this.layers[idx].setDepth(this.configManager.get('client/map/layersDepth/changePoints'));
            }
            idx++;
        }
        // display the animations over the proper layer:
        this.setObjectsAnimationsDepth();
    }

    setObjectsAnimationsDepth()
    {
        for(let idx in this.objectsAnimations){
            let objAnimation = this.objectsAnimations[idx];
            objAnimation.setDepthBasedOnLayer(this);
        }
    }

    registerTilesetAnimation(layer)
    {
        this.tilesetAnimation = new TilesetAnimation();
        this.tilesetAnimation.register(layer, this.tileset.tileData);
        this.tilesetAnimation.start();
    }

}

module.exports = SceneDynamic;
