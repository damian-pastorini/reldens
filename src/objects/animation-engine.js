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
        this.animationKey = props.animationKey || false;
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
                // frames: this.anims.generateFrameNames('gems', { prefix: 'diamond_', end: 15, zeroPad: 4 }),
                /*
                var mummyAnimation = this.anims.create({
                    key: 'walk',
                    frames: this.anims.generateFrameNumbers('mummy'),
                    frameRate: 16,
                    repeat: 0
                });
                var sprite = this.add.sprite(50, 300, 'mummy');
                sprite.play('walk');
                */
                let animationData = {start: this.frameStart, end: this.frameEnd};
                let createData = {
                    key: this.animationKey,
                    frames: this.currentPreloader.anims.generateFrameNumbers(this.animationKey, animationData),
                    frameRate: this.frameRate,
                    repeat: this.repeat,
                    hideOnComplete: this.hideOnComplete
                };
                this.currentAnimation = this.currentPreloader.anims.create(createData);
                this.sceneSprite = currentScene.physics.add.sprite(this.animPos.x, this.animPos.y, this.animationKey);
                currentScene.objectsAnimations[this.animationKey] = this;
            } else {
                console.log('ERROR - Active scene not found');
            }
        } else {
            console.log('ERROR - Animation disabled.');
        }
    }

    setDepthBasedOnLayer(currentScene)
    {
        let result = 0;
        for(let layerIdx in currentScene.layers){
            let layer = currentScene.layers[layerIdx];
            if(this.layerName === layer.layer.name){
                result = layer.depth + 1;
                this.sceneSprite.setDepth(result);
                break;
            }
        }
        return result;
    }

    runAnimation()
    {
        if(this.sceneSprite){
            this.sceneSprite.anims.play(this.animationKey, true);
        } else {
            console.log('ERROR - Current animation not found.');
        }
    }

}

module.exports = AnimationEngine;
