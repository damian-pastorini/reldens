/**
 *
 * Reldens - ObjectBattleAnimation
 *
 */

const { ActionsConst } = require('../../actions/constants');
const { Logger, sc } = require('@reldens/utils');

class ObjectBattleAnimation
{

    constructor(props)
    {
        this.missingSpriteRetry = 0;
        this.missingSpritesTimeOut = sc.get(props, 'missingSpritesTimeOut', 200);
        this.missingSpritesMaxRetries = sc.get(props, 'missingSpritesMaxRetries', 5);
    }

    objectBattleEndAnimation(message, gameManager)
    {
        if(message.act !== ActionsConst.BATTLE_ENDED){
            return false;
        }
        // @TODO - BETA - Replace all defaults by constants.
        let deathKey = sc.get(gameManager.config.client.skills.animations, message.k + '_death', 'default_death');
        let currentScene = gameManager.activeRoomEvents.getActiveScene();
        try {
            this.playDeathAnimation(deathKey, currentScene, message);
        } catch (error) {
            Logger.warning('Error on sprite "'+deathKey+'" not available.', error.message);
        }
        if(!sc.hasOwn(message, ActionsConst.DATA_OBJECT_KEY_TARGET)){
            return false;
        }
        if(message[ActionsConst.DATA_OBJECT_KEY_TARGET] === currentScene.player.currentTarget?.id){
            gameManager.gameEngine.clearTarget();
        }
        let hidePlayerSprite = sc.get(currentScene.player.players, message[ActionsConst.DATA_OBJECT_KEY_TARGET], false);
        if(!hidePlayerSprite){
            return false;
        }
        hidePlayerSprite.visible = false;
        if(sc.hasOwn(hidePlayerSprite, 'nameSprite') && hidePlayerSprite.nameSprite){
            hidePlayerSprite.nameSprite.visible = false;
        }
    }

    playDeathAnimation(deathKey, currentScene, message)
    {
        if(!currentScene.getAnimationByKey(deathKey)){
            if(this.missingSpritesMaxRetries === this.missingSpriteRetry){
                Logger.debug('Sprite "'+deathKey+'" not available.', deathKey);
                return false;
            }
            this.missingSpriteRetry++;
            setTimeout(
                () => {
                    return this.playDeathAnimation(deathKey, currentScene, message);
                },
                this.missingSpritesTimeOut
            );
            return false;
        }
        let skeletonSprite = currentScene.physics.add.sprite(message.x, message.y, deathKey);
        skeletonSprite.setDepth(10500);
        skeletonSprite.anims.play(deathKey, true).on('animationcomplete', () => {
            skeletonSprite.destroy();
        });
        return true;
    }

}

module.exports.ObjectBattleAnimation = ObjectBattleAnimation;
