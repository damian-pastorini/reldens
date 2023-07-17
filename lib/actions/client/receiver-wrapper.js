/**
 *
 * Reldens - ReceiverWrapper
 *
 */

const { Receiver } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../constants');

class ReceiverWrapper extends Receiver
{

    constructor(props)
    {
        super(props);
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ReceiverWrapper.');
        }
        this.gameManager = sc.get(props.roomEvents, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ReceiverWrapper.');
        }
        this.room = sc.get(props.roomEvents, 'room', false);
        if(!this.room){
            Logger.error('Room undefined in ReceiverWrapper.');
        }
        this.translator = this.gameManager?.services?.translator;
    }

    processMessage(message)
    {
        if(!this.gameManager){
            return false;
        }
        let currentScene = this.gameManager.getActiveScene();
        if(!currentScene || !currentScene.player){
            return false;
        }
        super.processMessage(message);
        this.playAttackOrEffectAnimation(message, currentScene);
        this.playHitAnimation(message, currentScene);
    }

    playHitAnimation(message, currentScene)
    {
        if(-1 === message.act.indexOf('_hit')){
            return;
        }
        this.runHitAnimation(message.x, message.y, currentScene, message.act);
    }

    playAttackOrEffectAnimation(message, currentScene)
    {
        let isEffect = -1 !== message.act.indexOf('_eff');
        let isAttack = -1 !== message.act.indexOf('_atk');
        if(!isAttack && !isEffect){
            return;
        }
        this.events.emitSync('reldens.playerAttack', message, this.room);
        let actKey = isEffect ? '_eff' : '_atk';
        let animKey = message.act.substring(0, message.act.indexOf(actKey));
        let {ownerSprite, targetSprite, targetType} = this.extractOwnerTargetAndType(currentScene, message);
        // @TODO - BETA - Refactor to use a single play animation method and make sure the animation is valid.
        let actAnimKey = sc.get(this.gameManager.config.client.skills.animations, animKey, 'default' + actKey);
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
            ownerAnim.anims.play(actAnimKey + playDir, true).on('animationcomplete', () => {
                ownerAnim.destroy();
            });
        }
        if(targetSprite){
            this.runHitAnimation(
                targetSprite.x,
                targetSprite.y,
                currentScene,
                animKey + '_hit',
                message.target,
                targetType
            );
        }
    }

    extractOwnerTargetAndType(currentScene, message)
    {
        let ownerSprite = false;
        let targetSprite = false;
        let targetType = ActionsConst.DATA_TYPE_VALUE_PLAYER;
        let playersList = currentScene.player.players;
        let objectsList = currentScene.objectsAnimations;
        let isPvP = (sc.hasOwn(playersList, message.owner) && sc.hasOwn(playersList, message.target));
        if(isPvP){
            ownerSprite = playersList[message.owner];
            targetSprite = playersList[message.target];
            return {ownerSprite, targetSprite, targetType};
        }
        if(sc.hasOwn(objectsList, message.owner)){
            ownerSprite = objectsList[message.owner].sceneSprite;
            targetSprite = playersList[message.target];
        }
        if(sc.hasOwn(objectsList, message.target)){
            targetSprite = objectsList[message.target].sceneSprite;
            ownerSprite = playersList[message.owner];
            targetType = ActionsConst.DATA_TYPE_VALUE_OBJECT;
        }
        return {ownerSprite, targetSprite, targetType};
    }

    runHitAnimation(x, y, currentScene, hitKey, targetKey, targetType)
    {
        // @TODO - BETA - Refactor.
        let allAnimations = this.gameManager.config.client.skills.animations;
        let hitAnimKey = sc.hasOwn(allAnimations, hitKey) ? hitKey : ActionsConst.DEFAULT_HIT_ANIMATION_KEY;
        if(!currentScene.getAnimationByKey(hitAnimKey) || !sc.hasOwn(allAnimations, hitAnimKey)){
            return false;
        }
        let targetSprite = false;
        let targetSpriteId = false;
        if(targetType === ActionsConst.DATA_TYPE_VALUE_PLAYER){
            targetSprite = this.gameManager.getCurrentPlayer().players[targetKey];
            targetSpriteId = targetSprite.playerId;
        }
        if(targetType === ActionsConst.DATA_TYPE_VALUE_OBJECT){
            targetSprite = currentScene.objectsAnimations[targetKey];
            targetSpriteId = targetKey;
        }
        let hitSprite = currentScene.physics.add.sprite(x, y, hitAnimKey);
        hitSprite = this.setTargetSpriteDepth(targetSprite, hitAnimKey, targetSpriteId, hitSprite, allAnimations);
        hitSprite.anims.play(hitAnimKey, true).on('animationcomplete', () => {
            hitSprite.destroy();
            if(targetSprite && sc.hasOwn(targetSprite, 'moveSprites')){
                delete targetSprite.moveSprites[hitAnimKey+'_'+targetSpriteId];
            }
        });
    }

    setTargetSpriteDepth(targetSprite, hitAnimKey, targetSpriteId, hitSprite, allAnimations)
    {
        if(!targetSprite){
            hitSprite.setDepth(300000);
            return hitSprite;
        }
        if (sc.hasOwn(targetSprite, 'targetSprite')) {
            targetSprite.moveSprites[hitAnimKey + '_' + targetSpriteId] = hitSprite;
        }
        let animData = allAnimations[hitAnimKey];
        let depth = 'above' === sc.get(animData.animationData, 'depthByPlayer', '')
            ? targetSprite.depth + 100
            : targetSprite.depth - 0.1;
        hitSprite.depthByPlayer = animData.animationData.depthByPlayer;
        hitSprite.setDepth(depth);
        return hitSprite;
    }

    updateLevelAndExperience(message)
    {
        this.gameManager.gameDom.updateContent(
            ActionsConst.SELECTORS.LEVEL_LABEL,
            this.translator.t(
                ActionsConst.SNIPPETS.LEVEL,
                {currentLevel: message.data[ActionsConst.MESSAGE.DATA.LEVEL]}
            )
        );
        this.onLevelExperienceAdded(message);
        let classPathLabel = message.data[ActionsConst.MESSAGE.DATA.CLASS_PATH_LABEL];
        if(classPathLabel){
            this.gameManager.gameDom.updateContent(
                ActionsConst.SELECTORS.CLASS_PATH_LABEL,
                this.translator.t(ActionsConst.SNIPPETS.CLASS_PATH_LABEL, {classPathLabel})
            );
        }
        let nextLevelExperience = message.data[ActionsConst.MESSAGE.DATA.NEXT_LEVEL_EXPERIENCE];
        if(nextLevelExperience){
            this.gameManager.gameDom.updateContent(
                ActionsConst.SELECTORS.NEXT_LEVEL_EXPERIENCE,
                this.translator.t(ActionsConst.SNIPPETS.NEXT_LEVEL_EXPERIENCE, {nextLevelExperience})
            );
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
        this.gameManager.skills.skills = message.data[ActionsConst.MESSAGE.DATA.SKILL_LEVEL];
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
            this.playSkillPlayerAnimation(this.gameManager.getCurrentPlayer().playerId, levelUpAnimKey);
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
        this.gameManager.gameDom.updateContent(
            ActionsConst.SELECTORS.CURRENT_EXPERIENCE,
            this.translator.t(
                ActionsConst.SNIPPETS.EXPERIENCE,
                {experience: message.data[ActionsConst.MESSAGE.DATA.EXPERIENCE]}
            )
        );
    }

    onSkillBeforeCast(message)
    {
        this.playSkillPlayerAnimation(
            message.data.extraData[ActionsConst.DATA_OWNER_KEY],
            this.determineCastKey(message)
        );
    }

    determineCastKey(message)
    {
        let castKey = message.data.skillKey + '_cast';
        if(sc.hasOwn(this.gameManager.config.client.skills.animations, castKey)){
            return castKey;
        }
        return 'default_cast';
    }

    playSkillPlayerAnimation(ownerId, animationKey)
    {
        let currentScene = this.gameManager.getActiveScene();
        let sceneAnimation = currentScene.getAnimationByKey(animationKey);
        if(!sceneAnimation){
            if(-1 === animationKey.indexOf('default')){
                Logger.error('Animation sprite not found', animationKey);
            }
            return false;
        }
        let ownerSprite = this.gameManager.getCurrentPlayer().players[ownerId];
        let spriteX = ownerSprite.x;
        let spriteY = ownerSprite.y;
        let animationSprite = currentScene.physics.add.sprite(spriteX, spriteY, animationKey);
        // the default value will be the caster depth - 1 so the animation will be played below the player.
        let depth = sc.hasOwn(sceneAnimation, 'depthByPlayer') && 'above' === sceneAnimation['depthByPlayer']
            ? ownerSprite.depth + 1 : ownerSprite.depth - 0.1;
        animationSprite.depthByPlayer = sceneAnimation.depthByPlayer;
        animationSprite.setDepth(depth);
        let blockMovement = sc.get(sceneAnimation, 'blockMovement', false);
        if(!blockMovement){
            ownerSprite.moveSprites[animationKey+'_'+ownerSprite.playerId] = animationSprite;
        }
        animationSprite.anims.play(animationKey, true);
        let destroyTime = sc.get(sceneAnimation, 'destroyTime', false);
        if(destroyTime){
            setTimeout(() => {
                animationSprite.destroy();
                delete ownerSprite.moveSprites[animationKey+'_'+ownerSprite.playerId];
            }, destroyTime);
        }
    }

    onSkillAfterCast(message)
    {
        let currentPlayer = this.gameManager.getCurrentPlayer();
        if(
            !sc.hasOwn(message.data.extraData, ActionsConst.DATA_OWNER_TYPE)
            || !sc.hasOwn(message.data.extraData, ActionsConst.DATA_OWNER_KEY)
            || message.data.extraData[ActionsConst.DATA_OWNER_TYPE] !== ActionsConst.DATA_TYPE_VALUE_PLAYER
            || !sc.hasOwn(currentPlayer.players, message.data.extraData[ActionsConst.DATA_OWNER_KEY])
        ){
            return false;
        }
        let currentScene = this.gameManager.getActiveScene();
        let ownerSprite = this.gameManager.getCurrentPlayer()
            .players[message.data.extraData[ActionsConst.DATA_OWNER_KEY]];
        let playDirection = this.getPlayDirection(message.data.extraData, ownerSprite, currentPlayer, currentScene);
        if(playDirection){
            ownerSprite.anims.play(ownerSprite.avatarKey+'_'+playDirection, true);
            ownerSprite.anims.stop();
        }
    }

    onSkillAttackApplyDamage(message)
    {
        let damageConfig = this.gameManager.config.get('client/actions/damage');
        if(!damageConfig.enabled){
            return false;
        }
        let currentPlayer = this.gameManager.getCurrentPlayer();
        if(!damageConfig.showAll && message.data.extraData[ActionsConst.DATA_OWNER_KEY] !== currentPlayer.playerId){
            return false;
        }
        let currentScene = this.gameManager.getActiveScene();
        let target = currentScene.getObjectFromExtraData(
            ActionsConst.DATA_OBJECT_KEY_TARGET,
            message.data.extraData,
            currentPlayer
        );
        if(!target){
            return false;
        }
        currentScene.createFloatingText(
            target.x,
            target.y,
            message.data.d,
            damageConfig.color,
            damageConfig.font,
            damageConfig.fontSize,
            damageConfig.duration,
            damageConfig.top,
            damageConfig.stroke,
            damageConfig.strokeThickness,
            damageConfig.shadowColor
        );
    }

    getPlayDirection(extraData, ownerSprite, currentPlayer, currentScene)
    {
        let playDirection = false;
        let target = currentScene.getObjectFromExtraData(ActionsConst.DATA_OBJECT_KEY_TARGET, extraData, currentPlayer);
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
