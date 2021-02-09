/**
 *
 * Reldens - ReceiverWrapper
 *
 * Reldens/Skills Receiver custom implementation to include gameManager and room references.
 *
 */

const { Receiver } = require('@reldens/skills');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

class ReceiverWrapper extends Receiver
{

    constructor(props, roomEvents)
    {
        super(props);
        this.gameManager = roomEvents.gameManager;
        this.room = roomEvents.room;
    }

    processMessage(message)
    {
        let currentScene = this.gameManager.getActiveScene();
        if(!currentScene || !currentScene.player){
            return false;
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
            // @TODO - BETA - Refactor to use a single play animation method and make sure the animation is valid.
            let actAnimKey = sc.hasOwn(this.gameManager.config.client.skills.animations, animKey)
                ? animKey : 'default'+actKey;
            if(ownerSprite && currentScene.getAnimationByKey(actAnimKey)){
                let ownerAnim = currentScene.physics.add.sprite(ownerSprite.x, ownerSprite.y, actAnimKey);
                ownerAnim.setDepth(200000);
                // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
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
                this.runHitAnimation(
                    targetSprite.x,
                    targetSprite.y,
                    currentScene,
                    animKey+'_hit',
                    message.target,
                    targetType
                );
            }
        }
        if(message.act.indexOf('_hit') !== -1){
            this.runHitAnimation(message.x, message.y, currentScene, message.act);
        }
    }

    runHitAnimation(x, y, currentScene, hitKey, targetKey, targetType)
    {
        let allAnimations = this.gameManager.config.client.skills.animations;
        let hitAnimKey = sc.hasOwn(allAnimations, hitKey) ? hitKey : 'default_hit';
        if(!currentScene.getAnimationByKey(hitAnimKey) || !sc.hasOwn(allAnimations, hitAnimKey)){
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
            let animData = allAnimations[hitAnimKey];
            let depth = sc.hasOwn(animData.animationData, 'depthByPlayer')
                && animData.animationData['depthByPlayer'] === 'above'
                ? targetSprite.depth+1 : targetSprite.depth - 0.1;
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
        // @TODO - BETA - Make all messages and classes configurable.
        this.gameManager.gameDom.updateContent('.level-container .level-label', 'Level '+message.data.lvl);
        this.gameManager.gameDom.updateContent('.experience-container .current-experience', message.data.exp);
        if(message.data.lab){
            this.gameManager.gameDom.updateContent('.class-path-container .class-path-label', message.data.lab);
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
        let levelUpAnimKey = this.getLevelUpAnimationKey(message.data.skl);
        if(levelUpAnimKey){
            this.playPlayerAnimation(this.gameManager.getCurrentPlayer().playerId, levelUpAnimKey);
        }
    }

    getLevelUpAnimationKey(level)
    {
        let animationsListObj = this.gameManager.config.client.levels.animations;
        let exactKey = 'level_'+this.gameManager.playerData.avatarKey+'_'+level;
        if(sc.hasOwn(animationsListObj, exactKey)){
            return exactKey;
        }
        let avatarKey = 'level_'+this.gameManager.playerData.avatarKey;
        if(sc.hasOwn(animationsListObj, avatarKey)){
            return avatarKey;
        }
        let levelKey = 'level_'+level;
        if(sc.hasOwn(animationsListObj, levelKey)){
            return levelKey;
        }
        if(sc.hasOwn(animationsListObj, 'level_default')){
            return 'level_default';
        }
        return false;
    }

    onLevelExperienceAdded(message)
    {
        this.gameManager.gameDom.updateContent('.experience-container .current-experience', message.data.exp);
    }

    // eslint-disable-next-line no-unused-vars
    onSkillBeforeCast(message)
    {
        // cast animation:
        let castKey = message.data.skillKey+'_cast';
        let castAnimKey = sc.hasOwn(this.gameManager.config.client.skills.animations, castKey)
            ? castKey : 'default_cast';
        this.playPlayerAnimation(message.data.extraData.oK, castAnimKey);
    }

    playPlayerAnimation(ownerId, animationKey)
    {
        let currentScene = this.gameManager.getActiveScene();
        let sceneAnimation = currentScene.getAnimationByKey(animationKey);
        if(!sceneAnimation){
            if(animationKey.indexOf('default') === -1){
                Logger.error('Animation sprite not found', animationKey);
            }
            return false;
        }
        let ownerSprite = this.gameManager.getCurrentPlayer().players[ownerId];
        let spriteX = ownerSprite.x;
        let spriteY = ownerSprite.y;
        let animationSprite = currentScene.physics.add.sprite(spriteX, spriteY, animationKey);
        let destroyTime = sc.getDef(sceneAnimation, 'destroyTime', false);
        // the default value will be the caster depth - 1 so the animation will be played below the player.
        let depth = sc.hasOwn(sceneAnimation, 'depthByPlayer') && sceneAnimation['depthByPlayer'] === 'above'
            ? ownerSprite.depth + 1 : ownerSprite.depth - 0.1;
        animationSprite.depthByPlayer = sceneAnimation.depthByPlayer;
        animationSprite.setDepth(depth);
        let blockMovement = sc.getDef(sceneAnimation, 'blockMovement', false);
        if(!blockMovement){
            ownerSprite.moveSprites[animationKey+'_'+ownerSprite.playerId] = animationSprite;
        }
        animationSprite.anims.play(animationKey, true);
        if(destroyTime){
            setTimeout(() => {
                animationSprite.destroy();
                delete ownerSprite.moveSprites[animationKey+'_'+ownerSprite.playerId];
            }, destroyTime)
        }
    }

    // eslint-disable-next-line no-unused-vars
    onSkillAfterCast(message)
    {
        let currentPlayer = this.gameManager.getCurrentPlayer();
        if(
            !sc.hasOwn(message.data.extraData, 'oT') || !sc.hasOwn(message.data.extraData, 'oK')
            || message.data.extraData.oT !== 'p'
            || !sc.hasOwn(currentPlayer.players, message.data.extraData.oK)
        ){
            return false;
        }
        let currentScene = this.gameManager.getActiveScene();
        let ownerSprite = this.gameManager.getCurrentPlayer().players[message.data.extraData.oK];
        let playDirection = this.getPlayDirection(message.data.extraData, ownerSprite, currentPlayer, currentScene);
        if(playDirection){
            ownerSprite.anims.play(ownerSprite.avatarKey+'_'+playDirection, true);
            ownerSprite.anims.stop();
        }
    }

    getPlayDirection(extraData, ownerSprite, currentPlayer, currentScene)
    {
        let playDirection = false;
        let target = false;
        if(extraData.tT !== 'p' && sc.hasOwn(currentScene.objectsAnimations, extraData.tK)){
            target = currentScene.objectsAnimations[extraData.tK];
        }
        if(extraData.tT === 'p' && sc.hasOwn(currentPlayer.players, extraData.tK)){
            target = currentPlayer.players[extraData.tK];
        }
        if(!target){
            return false;
        }
        let playX = target.x - ownerSprite.x;
        let playY = target.y - ownerSprite.y;
        playDirection = (playX >= 0) ? GameConst.RIGHT : GameConst.LEFT;
        if(Math.abs(playX) < Math.abs(playY)){
            playDirection = (playY >= 0) ? GameConst.DOWN : GameConst.UP;
        }
        return playDirection;
    }

}

module.exports.ReceiverWrapper = ReceiverWrapper;
