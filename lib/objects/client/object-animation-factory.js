/**
 *
 * Reldens - ObjectAnimationFactory
 *
 */

const { AnimationEngine } = require('./animation-engine');
const { ObjectsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class ObjectAnimationFactory
{

    constructor(events)
    {
        this.events = events;
    }

    async createDynamicAnimations(sceneDynamic)
    {
        if(!sceneDynamic.objectsAnimationsData){
            Logger.info('None animations defined on this scene: '+sceneDynamic.key);
            return;
        }
        await this.events.emit('reldens.createDynamicAnimationsBefore', this, sceneDynamic);
        for(let i of Object.keys(sceneDynamic.objectsAnimationsData)){
            let animProps = sceneDynamic.objectsAnimationsData[i];
            await this.createAnimationFromAnimData(animProps, sceneDynamic);
        }
    }

    async createAnimationFromAnimData(animProps, sceneDynamic)
    {
        if(!animProps.key){
            Logger.error('Animation key not specified. Skipping registry.', animProps);
            return false;
        }
        animProps.frameRate = sceneDynamic.configuredFrameRate;
        let existentBody = this.fetchExistentBody(sceneDynamic, sceneDynamic.gameManager.activeRoomEvents, animProps);
        this.updateAnimationPosition(existentBody, animProps);
        await this.events.emit('reldens.createDynamicAnimation_'+animProps.key, this, animProps);
        let animationEngine = new (sceneDynamic.gameManager.config.getWithoutLogs(
            'client/customClasses/objects/'+sc.get(animProps, 'classKey', animProps.key),
            AnimationEngine
        ))(sceneDynamic.gameManager, animProps, sceneDynamic);
        this.updateAnimationVisibility(existentBody, animationEngine.createAnimation());
        return animationEngine;
    }

    updateAnimationPosition(existentBody, animProps)
    {
        if(!existentBody){
            return false;
        }
        if(animProps.x !== existentBody.x){
            animProps.x = existentBody.x;
        }
        if(animProps.y !== existentBody.y){
            animProps.y = existentBody.y;
        }
    }

    updateAnimationVisibility(existentBody, sprite)
    {
        if(!existentBody){
            return false;
        }
        if(GameConst.STATUS.DEATH !== existentBody.inState && GameConst.STATUS.DISABLED !== existentBody.inState){
            return false;
        }
        sprite.visible = false;
    }

    fetchExistentBody(sceneDynamic, activeRoomEvents, animProps)
    {
        if(sceneDynamic.key !== activeRoomEvents.roomName){
            Logger.warning('Scene key and roomName miss match: '+sceneDynamic.key+' / '+activeRoomEvents.roomName+'.');
            return false;
        }
        return activeRoomEvents.room.state.bodies.get(animProps?.key);
    }

    updateObjectsAnimations(key, body, currentScene)
    {
        let objectAnimation = sc.get(currentScene.objectsAnimations, key);
        if(!objectAnimation || !sc.isFunction(objectAnimation.updateObjectAndSpritePositions)){
            Logger.error('Object animation update failed.', key, objectAnimation);
            return false;
        }
        objectAnimation.updateObjectAndSpritePositions(body.x, body.y);
        this.events.emit('reldens.objectBodyChanged', {body, key});
        objectAnimation.inState = body.inState;
        let animToPlay = this.fetchAvailableAnimationKey(currentScene, objectAnimation, body);
        if('' !== animToPlay){
            objectAnimation.sceneSprite.anims.play(animToPlay, true);
        }
        this.moveSpritesObjects(objectAnimation, body.x, body.y, objectAnimation.updateObjectDepth());
        if(body.mov){
            return false;
        }
        objectAnimation.sceneSprite.anims.stop();
        objectAnimation.sceneSprite.mov = body.mov;
        if(!objectAnimation.autoStart){
            return false;
        }
        objectAnimation.sceneSprite.anims.play(
            this.determineAutoStartAnimation(objectAnimation, animToPlay)
        );
        return true;
    }

    determineAutoStartAnimation(objectAnimation, animToPlay)
    {
        if(true === objectAnimation.autoStart){
            return objectAnimation.key;
        }
        if(objectAnimation.autoStart === ObjectsConst.DYNAMIC_ANIMATION){
            return animToPlay;
        }
        return objectAnimation.autoStart;
    }

    fetchAvailableAnimationKey(currentScene, objectAnimation, body)
    {
        return sc.getByPriority(currentScene.anims.anims.entries, [
            objectAnimation.key + '_' + body.dir,
            objectAnimation.layerName + '_' + objectAnimation.id + '_' + body.dir,
            objectAnimation.key
        ]) || '';
    }

    moveSpritesObjects(currentObj, x, y, objectNewDepth)
    {
        if(!currentObj.moveSprites){
            return;
        }
        let moveObjectsKeys = Object.keys(currentObj.moveSprites);
        if(0 === moveObjectsKeys.length){
            return;
        }
        for(let i of moveObjectsKeys){
            let sprite = currentObj.moveSprites[i];
            sprite.x = x;
            sprite.y = y;
            sprite.setDepth(
                objectNewDepth + (('above' === sc.get(currentObj.animationData, 'depthByPlayer', '')) ? 1 : -0.1)
            );
        }
    }

}

module.exports.ObjectAnimationFactory = ObjectAnimationFactory;
