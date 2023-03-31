/**
 *
 * Reldens - Reward
 *
 */

const { ObjectsItemsRewardsAnimations } = require('./objects_items_rewards_animations');
const { ObjectsConst } = require('../../../objects/constants');
const { sc } = require('@reldens/utils');

class Reward
{

    constructor(param)
    {
        this.id = sc.get(param, 'id', 0);
        this.objectId = sc.get(param, 'objectId', 0);
        this.itemId = sc.get(param, 'itemId', null);
        this.modifierId = sc.get(param, 'modifierId', null);
        this.experience = sc.get(param, 'experience', -1);
        this.dropRate = sc.get(param, 'dropRate', -1);
        this.dropQuantity = sc.get(param, 'dropQuantity', -1);
        this.isUnique = 1 === sc.get(param,'isUnique', 0);
        this.wasGiven = 1 === sc.get(param,'wasGiven', 0);
        this.hasDropBody = 1 === sc.get(param,'hasDropBody', 0);
        this.animationData = sc.get(param, 'animationData', null);
        this.item = sc.get(param, 'item', null);
        this.modifier = sc.get(param, 'modifier', null);
    }

    isWinningReward()
    {
        if(0 === this.dropRate){
            return false;
        }
        return Math.floor(Math.random() * 100) <= this.dropRate;
    }

    isValidReward()
    {
        if(0 === this.dropQuantity){
            return false;
        }
        if(this.isUnique && this.wasGiven){
            return false;
        }
        return !(!this.isItemType() && !this.isModifierType() && !this.hasExperienceSet());
    }

    isItemType()
    {
        return this.itemId;
    }

    isModifierType()
    {
        return this.modifierId;
    }

    hasExperienceSet()
    {
        return 0 < this.experience;
    }

    isDroppable()
    {
        return this.hasDropBody && sc.get(this, 'animationData', false);
    }

    static areValidRewards(rewards)
    {
        return 0 < (rewards?.length || 0);
    }

    static getRewardsBag(rewards)
    {
        let itemRangeArray = [];
        for(let reward of rewards){
            let itemRangeCount = itemRangeArray.length;
            for(let i = 0; i < reward.dropRate; i++){
                itemRangeArray[itemRangeCount + i] = reward;
            }
        }
        return itemRangeArray;
    }

    static fromModel(rewardModel)
    {
        if(!rewardModel){
            return null;
        }
        return new Reward({
            'id': rewardModel.id,
            'objectId': rewardModel.object_id,
            'itemId': rewardModel.item_id,
            'modifierId': rewardModel.modifier_id,
            'experience': rewardModel.experience,
            'dropRate': rewardModel.drop_rate,
            'dropQuantity': rewardModel.drop_quantity,
            'isUnique': rewardModel.is_unique,
            'wasGiven': rewardModel.was_given,
            'hasDropBody': rewardModel.has_drop_body,
            'animationData': ObjectsItemsRewardsAnimations.fromModel(rewardModel.animations),
            'item': rewardModel.items_item,
            'modifier': rewardModel.modifier
        });
    }

    static createDropObjectData(reward, roomId)
    {
        return {
            id: reward.randomRewardId + reward.tileIndex,
            room_id: roomId,
            layer_name: reward.randomRewardId,
            tile_index: reward.tileIndex,
            object_class_key: ObjectsConst.TYPE_DROP,
            client_key: reward.randomRewardId + reward.tileIndex,
            rewardModel: reward,
            asset_key: reward.animationData.assetKey,
            client_params: JSON.stringify({
                frameStart: reward.animationData.extraParams.start,
                frameEnd: reward.animationData.extraParams.end,
                repeat: sc.get(reward.animationData.extraParams, 'repeat', -1),
                hideOnComplete: false,
                autoStart: true,
                asset_key: reward.animationData.assetKey,
                yoyo: sc.get(reward.animationData.extraParams, 'yoyo', false)
            }),
            enabled: 1,
            objects_assets: [{
                object_asset_id: null,
                object_id: reward.randomRewardId,
                asset_type: reward.animationData.assetType,
                asset_key: reward.animationData.assetKey,
                file_1: reward.animationData.file,
                file_2: null,
                extra_params: JSON.stringify({
                    frameWidth: reward.animationData.extraParams.frameWidth,
                    frameHeight: reward.animationData.extraParams.frameHeight
                })
            }]
        };
    }

}

module.exports.Reward = Reward;
