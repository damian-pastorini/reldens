/**
 *
 * Reldens - AnimationEngine
 *
 */

const { Logger } = require('@reldens/utils');
const { ObjectsConst } = require('../constants');

class AnimationEngine
{

    constructor(gameManager, props, currentPreloader)
    {
        this.currentPreloader = currentPreloader;
        this.gameManager = gameManager;
        this.enabled = props.enabled || false;
        this.key = props.key;
        this.id = props.id;
        this.asset_key = props.asset_key || props.key;
        this.type = props.type || false;
        this.ui = props.ui || false;
        this.targetName = props.targetName;
        this.frameRate = props.frameRate || false;
        this.frameStart = props.frameStart || 0;
        this.frameEnd = props.frameEnd || 0;
        this.x = props.x || 0;
        this.y = props.y || 0;
        this.repeat = isNaN(props.repeat) ? -1 : props.repeat;
        this.hideOnComplete = props.hideOnComplete || false;
        // @NOTE: you cannot combine destroyOnComplete with repeat = -1, because an animation with infinite
        // repetitions will never trigger the complete event.
        this.destroyOnComplete = props.destroyOnComplete || false;
        this.autoStart = props.autoStart || false;
        this.layerName = props.layerName || false;
        this.positionFix = props.positionFix || false;
        this.zeroPad = props.zeroPad || false;
        this.prefix = props.prefix || false;
        this.isInteractive = props.isInteractive || false;
        this.restartTime = {}.hasOwnProperty.call(props, 'restartTime') ? props.restartTime : false;
        this.calculateAnimPosition();
    }

    calculateAnimPosition()
    {
        this.animPos = {x: this.x, y: this.y};
        if(this.positionFix){
            if({}.hasOwnProperty.call(this.positionFix, 'x')){
                this.animPos.x = this.x + this.positionFix.x;
            }
            if({}.hasOwnProperty.call(this.positionFix, 'y')){
                this.animPos.y = this.y + this.positionFix.y;
            }
        }
    }

    createAnimation()
    {
        if(!this.enabled){
            Logger.error('Animation disabled: '+this.key);
            return;
        }
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        if(!currentScene){
            Logger.error('Active scene not found.');
            return;
        }
        let animationData = {start: this.frameStart, end: this.frameEnd};
        if(this.prefix !== false){
            animationData.prefix = this.prefix;
        }
        if(this.zeroPad !== false){
            animationData.zeroPad = this.zeroPad;
        }
        this.frameNumbers = this.currentPreloader.anims.generateFrameNumbers(this.asset_key, animationData);
        let createData = {
            key: this.key,
            frames: this.frameNumbers,
            frameRate: this.frameRate,
            repeat: this.repeat,
            hideOnComplete: this.hideOnComplete
        };
        this.currentAnimation = this.currentPreloader.anims.create(createData);
        this.sceneSprite = currentScene.physics.add.sprite(this.animPos.x, this.animPos.y, this.asset_key);
        if(this.autoStart){
            this.sceneSprite.anims.play(this.key, true);
        }
        if(this.isInteractive){
            this.sceneSprite.setInteractive().on('pointerdown', () => {
                // @TODO: tempId is a temporal fix for multiple objects case.
                let tempId = (this.key === this.asset_key) ? this.id : this.key;
                this.gameManager.activeRoomEvents.room.send({
                    act: ObjectsConst.OBJECT_INTERACTION,
                    id: tempId,
                    type: this.type
                });
                if(this.targetName){
                    this.gameManager.gameEngine.showTarget(this.targetName);
                }
                currentScene.player.currentTarget = {id: tempId, type: ObjectsConst.TYPE_OBJECT};
            });
        }
        if(this.restartTime){
            this.sceneSprite.on('animationcomplete', () => {
                setTimeout(() => {
                    // if the animation was used to change the scene this won't be available on the user who run it.
                    if(this.sceneSprite.anims){
                        this.sceneSprite.anims.restart();
                        this.sceneSprite.anims.pause();
                    }
                }, this.restartTime);
            },
            this);
        }
        if(this.destroyOnComplete){
            this.sceneSprite.on('animationcomplete', () => {
                this.currentAnimation.destroy();
                this.sceneSprite.destroy();
            }, this);
        }
        // @NOTE: sprites depth will be set according to their Y position, since the same was applied on the
        // players sprites and updated as they move the depth is fixed automatically and the objects will get
        // above or below the player.
        this.sceneSprite.setDepth(this.y + this.sceneSprite.body.height);
        currentScene.objectsAnimations[this.key] = this;
    }

    runAnimation()
    {
        if(this.sceneSprite){
            this.sceneSprite.anims.play(this.key, true);
        } else {
            Logger.error('Current animation not found: '+this.key);
        }
    }

}

module.exports.AnimationEngine = AnimationEngine;
