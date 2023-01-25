const { ObjectsItemsRewardsAnimations } = require('./objects_items_rewards_animations');
const { sc } = require('@reldens/utils');
const { ObjectsConst } = require('../../../objects/constants');

class Reward
{
    id = 0;
    objectId = 0;
    itemId = 0;
    modifierId = 0;
    experience = -1;
    dropRate = -1;
    dropQuantity = -1;
    isUnique = false;
    wasGiven = false;
    hasDropBody = false;
    animationData = null;
    item = null;
    modifier = null;

    constructor(param)
    {
        this.id = sc.get(param, 'id', 0);
        this.objectId = sc.get(param, 'objectId', 0);
        this.itemId = sc.get(param, 'itemId', 0);
        this.modifierId = sc.get(param, 'modifierId', 0);
        this.experience = sc.get(param, 'experience', -1);
        this.dropRate = sc.get(param, 'dropRate', -1);
        this.dropQuantity = sc.get(param, 'dropQuantity', -1);
        this.isUnique = sc.get(param,'isUnique', 0) === 1;
        this.wasGiven = sc.get(param,'wasGiven', 0) === 1;
        this.hasDropBody = sc.get(param,'hasDropBody', 0) === 1;
        this.animationData = param.animationData;
        this.item = param.item;
        this.modifier = param.modifier;
    }

    isWinningReward()
    {
        if (0 === this.dropRate) {
            return false;
        }
        return Math.floor(Math.random() * 100) <= this.dropRate;
    }


    isValidReward()
    {
        if (0 === this.dropQuantity) {
            return false;
        }

        if (this.isUnique && this.wasGiven) {
            return false;
        }

        if (!this.isItemType() && !this.isModifierType() && !this.hasExperienceSet()) {
            return false;
        }

        return true;
    }

    isItemType()
    {
        return 0 !== Number(this.itemId);
    }

    isModifierType()
    {
        return 0 !== Number(this.modifierId);
    }

    hasExperienceSet()
    {
        return 0 <= this.experience;
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

        for (let reward of rewards) {
            let itemRangeCount = itemRangeArray.length;
            for (let i = 0; i < reward.dropRate; i++) {
                itemRangeArray[itemRangeCount + i] = reward;
            }
        }

        return itemRangeArray;
    }

    static fromModel(rewardModel)
    {
        if (!rewardModel) {
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