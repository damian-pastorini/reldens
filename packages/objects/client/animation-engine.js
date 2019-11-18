/**
 *
 * Reldens - AnimationEngine
 *
 */

class AnimationEngine
{

    constructor(gameManager, props, currentPreloader)
    {
        this.currentPreloader = currentPreloader;
        this.gameManager = gameManager;
        this.enabled = props.enabled || false;
        this.key = props.key || false;
        this.animationSprite = props.animationSprite || false;
        this.frameRate = props.frameRate || false;
        this.frameStart = props.frameStart || 0;
        this.frameEnd = props.frameEnd || 0;
        this.repeat = isNaN(props.repeat) ? -1 : props.repeat;
        this.hideOnComplete = props.hideOnComplete || false;
        this.layerName = props.layerName || false;
        this.x = props.x || 0;
        this.y = props.y || 0;
        this.positionFix = props.positionFix || false;
        this.zeroPad = props.zeroPad || false;
        this.prefix = props.prefix || false;
        this.calculateAnimPosition();
    }

    calculateAnimPosition()
    {
        this.animPos = {x: this.x, y: this.y};
        if(this.positionFix){
            if(this.positionFix.hasOwnProperty('x')){
                this.animPos.x = this.x + this.positionFix.x;
            }
            if(this.positionFix.hasOwnProperty('y')){
                this.animPos.y = this.y + this.positionFix.y;
            }
        }
    }

    createAnimation()
    {
        if(this.enabled){
            let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
            if(currentScene){
                let animationData = {start: this.frameStart, end: this.frameEnd};
                if(this.prefix !== false){
                    animationData.prefix = this.prefix;
                }
                if(this.zeroPad !== false){
                    animationData.zeroPad = this.zeroPad;
                }
                let createData = {
                    key: this.key,
                    frames: this.currentPreloader.anims.generateFrameNumbers(this.key, animationData),
                    frameRate: this.frameRate,
                    repeat: this.repeat,
                    hideOnComplete: this.hideOnComplete
                };
                this.currentAnimation = this.currentPreloader.anims.create(createData);
                this.sceneSprite = currentScene.physics.add.sprite(this.animPos.x, this.animPos.y, this.key);
                // @NOTE: sprites depth will be set according to their Y position, since the same was applied on the
                // players sprites and updated as they move the depth is fixed automatically and the objects will get
                // above or below the player.
                this.sceneSprite.setDepth(this.y + this.sceneSprite.body.height);
                currentScene.objectsAnimations[this.key] = this;
            } else {
                console.log('ERROR - Active scene not found');
            }
        } else {
            console.log('ERROR - Animation disabled.');
        }
    }

    setDepthBasedOnLayer(currentScene)
    {
        // @TODO: see setObjectsAnimationsDepth() in scene-dynamic line 144.
        /*
        console.log('this.layerName', this.layerName);
        let result = 0;
        for(let layerIdx in currentScene.layers){
            let layer = currentScene.layers[layerIdx];
            if(this.layerName === layer.layer.name){
                result = layer.depth + 1;
                console.log(this.sceneSprite, 'depth:', result);
                this.sceneSprite.setDepth(result);
                break;
            }
        }
        return result;
        */
    }

    runAnimation()
    {
        if(this.sceneSprite){
            this.sceneSprite.anims.play(this.key, true);
        } else {
            console.log('ERROR - Current animation not found.');
        }
    }

}

module.exports = AnimationEngine;
