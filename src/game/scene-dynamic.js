const Phaser = require('phaser');
const TilesetAnimation = require('./tileset-animation');
const share = require('../utils/constants');

class SceneDynamic extends Phaser.Scene
{

    constructor(key, data)
    {
        super({key});
        this.key = key;
        this.params = data;
        console.log('scene dynamic data', data);
        this.layers = {};
        this.transition = true;
        this.withTSAnimation = false;
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
                    this.player.stop(true);
                }
            });
            this.registerController();
        });
        this.cameras.main.on('camerafadeoutcomplete', this.changeScene.bind(this));
        // save active key into the game object to get it in other events.
        this.game.currentScene = this.key;
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
                this.player.left(true);
            } else if(this.keyRight.isDown){
                this.player.right(true);
            } else if(this.keyUp.isDown){
                this.player.up(true);
            } else if(this.keyDown.isDown){
                this.player.down(true);
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
        for(let i=0; i<this.map.layers.length; i++){
            // @TODO: tilesets margin and spacing will be part of the configuration in the database.
            if(this.withTSAnimation){
                this.layers[i] = this.map.createDynamicLayer(this.map.layers[i].name, this.tileset, 1, 2);
            } else {
                this.layers[i] = this.map.createStaticLayer(this.map.layers[i].name, this.tileset, 1, 2);
            }
            // layers over player:
            if(this.map.layers[i].name.indexOf('below-player') !== -1){
                // @TODO: layers depth will be part of the configuration in the database.
                this.layers[i].setDepth(0);
            }
            if(this.map.layers[i].name.indexOf('over-player') !== -1){
                // @TODO: layers depth will be part of the configuration in the database.
                this.layers[i].setDepth(i);
            }
            if(this.map.layers[i].name.indexOf('change-points') !== -1){
                // @TODO: layers depth will be part of the configuration in the database.
                this.layers[i].setDepth(0);
            }
        }
    }

    registerTilesetAnimation(layer)
    {
        this.tilesetAnimation = new TilesetAnimation();
        this.tilesetAnimation.register(layer, this.tileset.tileData);
        this.tilesetAnimation.start();
    }

    registerController()
    {
        // @TODO: controllers will be part of the configuration in the database.
        this.hold(document.getElementById(share.UP), this.player.up.bind(this.player));
        this.hold(document.getElementById(share.DOWN), this.player.down.bind(this.player));
        this.hold(document.getElementById(share.LEFT), this.player.left.bind(this.player));
        this.hold(document.getElementById(share.RIGHT), this.player.right.bind(this.player));
    }

    hold(btn, action)
    {
        let t;
        let repeat = () => {
            action();
            t = setTimeout(repeat, this.timeout);
        };
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if(this.transition === false){
                repeat();
            }
        });
        btn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            clearTimeout(t);
            if (this.transition === false) {
                this.player.stop();
            }
        });
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.transition === false) {
                repeat();
            }
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            clearTimeout(t);
            if (this.transition === false) {
                this.player.stop();
            }
        });
    }

}

module.exports = SceneDynamic;
