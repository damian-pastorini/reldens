/**
 *
 * Reldens - RewardsMessageListener
 *
 */

const { RewardsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class RewardsMessageListener
{

    static listenMessages(room, gameManager)
    {
        room.onMessage('*', (message) => {
            let rewards = sc.get(message, RewardsConst.REWARDS, false);
            if(rewards){
                this.loadRewards(rewards, gameManager);
            }
            if(RewardsConst.REMOVE_DROP === message.act){
                this.removeRewardById(message.id, gameManager);
            }
        });
    }

    static loadRewards(rewards, gameManager)
    {
        let currentScene = gameManager.getActiveScene();
        let gameConfig = gameManager.config;
        let objectPlugin = gameManager.getFeature('objects');
        let loader = currentScene.load;
        if(!this.validateParams({currentScene, gameConfig, objectPlugin, loader})){
            return false;
        }
        for(let [rewardId, reward] of Object.entries(rewards)){
            this.loadSpritesheet(reward, loader, gameConfig);
            loader.once('complete', async () => {
                await this.createRewardAnimation(objectPlugin, reward, rewardId, currentScene);
            });
        }
        loader.start();
        return true;
    }

    static async createRewardAnimation(objectsPlugin, reward, rewardId, currentScene)
    {
        return await objectsPlugin.createAnimationFromAnimData({
            type: RewardsConst.REWARDS_PICK_UP_ACT,
            enabled: true,
            ui: true,
            frameStart: reward[RewardsConst.REWARDS_PARAMS]['start'],
            frameEnd: reward[RewardsConst.REWARDS_PARAMS]['end'],
            repeat: reward[RewardsConst.REWARDS_PARAMS]['repeat'],
            autoStart: true,
            key: rewardId,
            id: rewardId,
            targetName: '',
            layerName: rewardId,
            isInteractive: true,
            asset_key: reward[RewardsConst.REWARDS_ASSET_KEY],
            x: reward.x,
            y: reward.y,
            yoyo: reward[RewardsConst.REWARDS_PARAMS]['yoyo']
        }, currentScene);
    }

    static loadSpritesheet(reward, loader, gameConfig)
    {
        loader.spritesheet(
            reward[RewardsConst.REWARDS_ASSET_KEY],
            this.getSpritesheetPath(reward),
            this.getRewardFrameConfig(reward[RewardsConst.REWARDS_PARAMS], gameConfig)
        );
    }

    static getRewardFrameConfig(rewardParams, gameConfig)
    {
        return {
            frameWidth: sc.get(
                rewardParams,
                'frameWidth',
                gameConfig.get('client/map/tileData/width', GameConst.GRAPHICS.FRAME_WIDTH)
            ),
            frameHeight: sc.get(
                rewardParams,
                'frameHeight',
                gameConfig.get('client/map/tileData/width', GameConst.GRAPHICS.FRAME_HEIGHT)
            )
        };
    }

    static getSpritesheetPath(reward)
    {
        return RewardsConst.REWARDS_PATH + reward[RewardsConst.REWARDS_FILE] + '.png';
    }

    static removeRewardById(rewardId, gameManager)
    {
        if(!rewardId){
            return false;
        }
        let currentScene = gameManager.activeRoomEvents.getActiveScene();
        let rewardAnimation = sc.get(currentScene.objectsAnimations, rewardId, false);
        if(!rewardAnimation){
            return false;
        }
        rewardAnimation.sceneSprite.destroy();
        delete currentScene.objectsAnimations[rewardId];
    }

    static validateParams(props)
    {
        let isValid = true;
        if(!sc.get(props, 'currentScene', false)){
            Logger.error('Scene is undefined in Rewards Message Listener.');
            isValid = false;
        }
        if(!sc.get(props, 'gameConfig', false)){
            Logger.error('Game Config is undefined in Rewards Message Listener.');
            isValid = false;
        }
        if(!sc.get(props, 'objectPlugin', false)){
            Logger.error('Object Plugin is undefined in Rewards Message Listener.');
            isValid = false;
        }
        if(!sc.get(props, 'loader', false)){
            Logger.error('Loader is undefined in Rewards Message Listener.');
            isValid = false;
        }
        return isValid;
    }
}

module.exports.RewardsMessageListener = RewardsMessageListener;
