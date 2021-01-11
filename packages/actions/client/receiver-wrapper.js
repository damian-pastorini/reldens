/**
 *
 * Reldens - ReceiverWrapper
 *
 * Reldens/Skills Receiver custom implementation to include gameManager and room references.
 *
 */

const { Receiver } = require('@reldens/skills');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

class ReceiverWrapper extends Receiver
{

    constructor(props, roomEvents)
    {
        super(props);
        this.gameManager = roomEvents.gameManager;
        this.room = roomEvents.room;
        this.queueMessages = [];
    }

    processMessage(message)
    {
        let currentScene = this.gameManager.getActiveScene();
        if(!currentScene || !currentScene.player){
            // @NOTE: if player still not set and it's a skills message we will process the message after the player
            // instance was created.
            if(this.isValidMessage(message)){
                this.queueMessages.push(message);
            }
            return true;
        }
        super.processMessage(message);
        if(message.act.indexOf('_atk') !== -1 || message.act.indexOf('_eff') !== -1){
            EventsManagerSingleton.emit('reldens.playerAttack', message, this.room);
            let actKey = (message.act.indexOf('_eff') !== -1) ? '_eff' : '_atk';
            let animKey = message.act.substring(0, message.act.indexOf(actKey));
            let ownerSprite = false;
            let targetSprite = false;
            let targetType = 'p';
            let isPvP = (
                sc.hasOwn(currentScene.player.players, message.owner)
                && sc.hasOwn(currentScene.player.players, message.target)
            );
            if(isPvP){
                ownerSprite = currentScene.player.players[message.owner];
                targetSprite = currentScene.player.players[message.target];
            } else {
                if(sc.hasOwn(currentScene.objectsAnimations, message.owner)){
                    ownerSprite = currentScene.objectsAnimations[message.owner].sceneSprite;
                    targetSprite = currentScene.player.players[message.target];
                }
                if(sc.hasOwn(currentScene.objectsAnimations, message.target)){
                    targetSprite = currentScene.objectsAnimations[message.target].sceneSprite;
                    ownerSprite = currentScene.player.players[message.owner];
                    targetType = 'o';
                }
            }
            // @TODO - BETA.17 - Refactor to use a single play animation method and make sure the animation is valid.
            let actAnimKey = sc.hasOwn(this.gameManager.config.client.skills.animations, animKey)
                ? animKey : 'default'+actKey;
            if(ownerSprite && currentScene.getAnimationByKey(actAnimKey)){
                let ownerAnim = currentScene.physics.add.sprite(ownerSprite.x, ownerSprite.y, actAnimKey);
                ownerAnim.setDepth(200000);
                // @TODO - BETA.17 - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
                //   down_left.
                let playDir = '';
                if(sc.hasOwn(this.gameManager.gameEngine.uiScene.directionalAnimations, actAnimKey)){
                    let animDir = this.gameManager.gameEngine.uiScene.directionalAnimations[actAnimKey];
                    playDir = (animDir === 3) ?
                        (ownerSprite.x < targetSprite.x ? '_right' : '_left')
                        : (ownerSprite.y < targetSprite.y ? '_down' : '_up');
                }
                ownerAnim.anims.play(actAnimKey+playDir, true).on('animationcomplete', () => {
                    ownerAnim.destroy();
                });
            }
            if(targetSprite){
                this.runHitAnimation(targetSprite.x, targetSprite.y, currentScene, animKey+'_hit', message.target, targetType);
            }
        }
        if(message.act.indexOf('_hit') !== -1){
            this.runHitAnimation(message.x, message.y, currentScene, message.act);
        }
    }

    runHitAnimation(x, y, currentScene, hitKey, targetKey, targetType)
    {
        let hitAnimKey = sc.hasOwn(this.gameManager.config.client.skills.animations, hitKey) ? hitKey : 'default_hit';
        if(!currentScene.getAnimationByKey(hitAnimKey)){
            return false;
        }
        let targetSprite = false;
        let targetSpriteId = false;
        if(targetType === 'p'){
            targetSprite = this.gameManager.getCurrentPlayer().players[targetKey];
            targetSpriteId = targetSprite.playerId;
        }
        if(targetType === 'o'){
            targetSprite = currentScene.objectsAnimations[targetKey];
            targetSpriteId = targetKey;
        }
        let hitSprite = currentScene.physics.add.sprite(x, y, hitAnimKey);
        if(targetSprite){
            targetSprite.moveSprites[hitAnimKey+'_'+targetSpriteId] = hitSprite;
            let animData = this.gameManager.config.client.skills.animations[hitKey];
            let depth = sc.hasOwn(animData.animationData, 'depthByPlayer')
                && animData.animationData['depthByPlayer'] === 'above'
                ? targetSprite.depth + 1 : targetSprite.depth - 0.1;
            hitSprite.depthByPlayer = animData.animationData.depthByPlayer;
            hitSprite.setDepth(depth);
        } else {
            hitSprite.setDepth(200000);
        }
        hitSprite.anims.play(hitAnimKey, true).on('animationcomplete', () => {
            hitSprite.destroy();
            if(targetSprite){
                delete targetSprite.moveSprites[hitAnimKey+'_'+targetSpriteId];
            }
        });
    }

    updateLevelAndExperience(message)
    {
        // @TODO - BETA.17 - Make all messages and classes configurable.
        this.gameManager.gameDom.updateContent('.level-container .level-label', 'Level '+message.data.lvl);
        this.gameManager.gameDom.updateContent('.experience-container .current-experience', message.data.exp);
        if(message.data.lab){
            this.gameManager.gameDom.updateContent('.class-path-container .class-path-label', message.data.lab);
        }
        // @NOTE: level label could override the path label.
        if(message.data.nl){
            this.gameManager.gameDom.updateContent('.class-path-container .class-path-label', message.data.nl);
        }
        if(message.data.ne){
            this.gameManager.gameDom.updateContent('.experience-container .next-level-experience', message.data.ne);
        }
    }

    onInitClassPathEnd(message)
    {
        // @NOTE: careful with messages received and double ui elements generation.
        if(this.gameManager.skills && this.gameManager.skills.uiCreated){
            return false;
        }
        this.gameManager.skills.uiCreated = true;
        this.updateLevelAndExperience(message);
        this.gameManager.skills.skills = message.data.skl;
        this.gameManager.getFeature('actions').uiManager.appendSkills(message.data.skl);
    }

    onLevelUp(message)
    {
        this.updateLevelAndExperience(message);
        if(sc.hasOwn(message.data, 'skl')){
            Object.assign(this.gameManager.skills.skills, message.data.skl);
            this.gameManager.getFeature('actions').uiManager.appendSkills(message.data.skl);
        }
    }

    onLevelExperienceAdded(message)
    {
        this.gameManager.gameDom.updateContent('.experience-container .current-experience', message.data.exp);
    }

    // @TODO - BETA.16 - Improve skills animations (no more rock throw! let's some real spells and weapons!).
    // eslint-disable-next-line no-unused-vars
    onSkillBeforeCast(message)
    {
        // cast animation:
        let currentScene = this.gameManager.getActiveScene();
        let castKey = message.data.skillKey+'_cast';
        let castAnimKey = sc.hasOwn(this.gameManager.config.client.skills.animations, castKey)
            ? castKey : 'default_cast';
        let animationSprite = currentScene.getAnimationByKey(castAnimKey);
        if(!animationSprite){
            if(castAnimKey.indexOf('default_') !== 0){
                Logger.error('Animation sprite not found', castAnimKey);
            }
            return false;
        }
        let ownerSprite = this.gameManager.getCurrentPlayer().players[message.data.extraData.oK];
        let spriteX = ownerSprite.x;
        let spriteY = ownerSprite.y;
        let castSprite = currentScene.physics.add.sprite(spriteX, spriteY, castAnimKey);
        let destroyTime = sc.getDef(animationSprite, 'destroyTime', false);
        // the default value will be the caster depth - 1 so the animation will be played below the player.
        let depth = sc.hasOwn(animationSprite, 'depthByPlayer') && animationSprite['depthByPlayer'] === 'above'
            ? ownerSprite.depth + 1 : ownerSprite.depth - 0.1;
        castSprite.depthByPlayer = animationSprite.depthByPlayer;
        castSprite.setDepth(depth);
        let blockMovement = sc.getDef(animationSprite, 'blockMovement', false);
        if(!blockMovement){
            ownerSprite.moveSprites[castAnimKey+'_'+ownerSprite.playerId] = castSprite;
        }
        castSprite.anims.play(castAnimKey, true);
        if(destroyTime){
            setTimeout(() => {
                castSprite.destroy();
                delete ownerSprite.moveSprites[castAnimKey+'_'+ownerSprite.playerId];
            }, destroyTime)
        }
    }

}

module.exports.ReceiverWrapper = ReceiverWrapper;
