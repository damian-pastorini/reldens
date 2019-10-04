const Phaser = require('phaser');
const TilesetAnimation = require('./tileset-animation');

class SceneDynamic extends Phaser.Scene
{

    constructor(key, data, config)
    {
        super({key});
        this.key = key;
        this.params = data;
        this.layers = {};
        this.transition = true;
        this.withTSAnimation = false;
        this.configManager = config;
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
        this.withTSAnimation = this.hasTSAnimation();
        this.tileset = this.map.addTilesetImage(this.params.roomMap);
        this.registerLayers();
        this.cameras.main.on('camerafadeincomplete', () => {
            this.transition = false;
            this.input.keyboard.on('keyup', (event) => {
                if (event.keyCode >= 37 && event.keyCode <= 40){
                    // @NOTE: all keyup events has to be sent.
                    this.player.stop();
                }
            });
        });
        this.cameras.main.on('camerafadeoutcomplete', this.changeScene.bind(this));
        if(this.withTSAnimation){
            // @NOTE: replaced animations from database by layers with name convention.
            for(let layerIndex in this.layers){
                if(this.layers.hasOwnProperty(layerIndex)){
                    let layer = this.layers[layerIndex];
                    if(layer.layer.name.indexOf('animations') !== -1){
                        this.registerTilesetAnimation(layer);
                    }
                }
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
        if(this.withTSAnimation){
            this.tilesetAnimation.destroy();
        }
    }

    hasTSAnimation()
    {
        for(let i=0; i<this.map.layers.length; i++){
            if(this.map.layers[i].name.indexOf('animations') !== -1){
                this.withTSAnimation = true;
                break;
            }
        }
    }

    registerLayers()
    {
        for(let i = 0; i < this.map.layers.length; i++){
            let margin = this.configManager.get('client/general/tileData/margin');
            let spacing = this.configManager.get('client/general/tileData/spacing');
            if(this.withTSAnimation){
                this.layers[i] = this.map.createDynamicLayer(this.map.layers[i].name, this.tileset, margin, spacing);
            } else {
                this.layers[i] = this.map.createStaticLayer(this.map.layers[i].name, this.tileset, margin, spacing);
            }
            if(this.map.layers[i].name.indexOf('below-player') !== -1){
                this.layers[i].setDepth(this.configManager.get('client/map/layersDepth/belowPlayer'));
            }
            if(this.map.layers[i].name.indexOf('over-player') !== -1){
                this.layers[i].setDepth(i);
            }
            if(this.map.layers[i].name.indexOf('change-points') !== -1){
                this.layers[i].setDepth(this.configManager.get('client/map/layersDepth/changePoints'));
            }
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
