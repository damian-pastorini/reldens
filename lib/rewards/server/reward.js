/**
 *
 * Reldens - Reward
 *
 * Represents a reward that can be dropped from objects or given through events, supporting items, experience, and modifiers with drop rate mechanics.
 *
 */

const { DropsAnimations } = require('./drops-animations');
const { ObjectTypes } = require('../../objects/server/object/object-types');
const { ObjectsConst } = require('../../objects/constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {Object} RewardParams
 * @property {number} id
 * @property {number} objectId
 * @property {number|null} itemId
 * @property {number|null} modifierId
 * @property {number} experience
 * @property {number} dropRate
 * @property {number} dropQuantity
 * @property {number} isUnique
 * @property {number} wasGiven
 * @property {number} hasDropBody
 * @property {DropsAnimations|null} animationData
 * @property {object|null} item
 * @property {object|null} modifier
 */
class Reward
{

    /**
     * @param {RewardParams} param
     */
    constructor(param)
    {
        /** @type {number} */
        this.id = sc.get(param, 'id', 0);
        /** @type {number} */
        this.objectId = sc.get(param, 'objectId', 0);
        /** @type {number|null} */
        this.itemId = sc.get(param, 'itemId', null);
        /** @type {number|null} */
        this.modifierId = sc.get(param, 'modifierId', null);
        /** @type {number} */
        this.experience = sc.get(param, 'experience', 0);
        /** @type {number} */
        this.dropRate = sc.get(param, 'dropRate', 0);
        /** @type {number} */
        this.dropQuantity = sc.get(param, 'dropQuantity', 0);
        /** @type {boolean} */
        this.isUnique = 1 === sc.get(param,'isUnique', 0);
        /** @type {boolean} */
        this.wasGiven = 1 === sc.get(param,'wasGiven', 0);
        /** @type {boolean} */
        this.hasDropBody = 1 === sc.get(param,'hasDropBody', 0);
        /** @type {DropsAnimations|null} */
        this.animationData = sc.get(param, 'animationData', null);
        /** @type {object|null} */
        this.item = sc.get(param, 'item', null);
        /** @type {object|null} */
        this.modifier = sc.get(param, 'modifier', null);
    }

    /**
     * @returns {boolean}
     */
    isWinningReward()
    {
        if(0 === this.dropRate){
            return false;
        }
        return Math.floor(Math.random() * 100) <= this.dropRate;
    }

    /**
     * @returns {boolean}
     */
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

    /**
     * @returns {number|null}
     */
    isItemType()
    {
        return this.itemId;
    }

    /**
     * @returns {number|null}
     */
    isModifierType()
    {
        return this.modifierId;
    }

    /**
     * @returns {boolean}
     */
    hasExperienceSet()
    {
        return 0 < this.experience;
    }

    /**
     * @returns {boolean}
     */
    isDroppable()
    {
        return this.hasDropBody && sc.get(this, 'animationData', false);
    }

    /**
     * @param {Array<Reward>} rewards
     * @returns {boolean}
     */
    static areValidRewards(rewards)
    {
        return 0 < (rewards?.length || 0);
    }

    /**
     * @param {Array<Reward>} rewards
     * @returns {Array<Reward>}
     */
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

    /**
     * @param {Object} rewardModel
     * @returns {Reward|null}
     */
    static fromModel(rewardModel)
    {
        if(!rewardModel){
            return null;
        }
        return new Reward({
            id: rewardModel.id,
            objectId: rewardModel.object_id,
            itemId: rewardModel.item_id,
            modifierId: rewardModel.modifier_id,
            experience: rewardModel.experience,
            dropRate: rewardModel.drop_rate,
            dropQuantity: rewardModel.drop_quantity,
            isUnique: rewardModel.is_unique,
            wasGiven: rewardModel.was_given,
            hasDropBody: rewardModel.has_drop_body,
            animationData: DropsAnimations.fromModel(rewardModel.related_items_item?.related_drops_animations),
            item: rewardModel.related_items_item,
            modifier: rewardModel.modifier
        });
    }

    /**
     * @param {Object} reward
     * @param {number} roomId
     * @returns {Object}
     */
    static createDropObjectData(reward, roomId)
    {
        return {
            id: reward.randomObjectId + reward.tileIndex,
            room_id: roomId,
            layer_name: reward.randomObjectId,
            tile_index: reward.tileIndex,
            class_type: ObjectTypes.DROP,
            object_class_key: ObjectsConst.TYPE_DROP,
            client_key: reward.randomObjectId + reward.tileIndex,
            itemId: reward.itemId,
            asset_key: reward.animationData.assetKey,
            client_params: JSON.stringify({
                frameStart: reward.animationData.extraParams.start,
                frameEnd: reward.animationData.extraParams.end,
                repeat: sc.get(reward.animationData.extraParams, 'repeat', -1),
                hideOnComplete: sc.get(reward.animationData.extraParams, 'hideOnComplete', false),
                autoStart: sc.get(reward.animationData.extraParams, 'autoStart', true),
                asset_key: reward.animationData.assetKey,
                yoyo: sc.get(reward.animationData.extraParams, 'yoyo', false)
            }),
            enabled: 1,
            objects_assets: [{
                object_asset_id: null,
                object_id: reward.randomObjectId,
                asset_type: reward.animationData.assetType,
                asset_key: reward.animationData.assetKey,
                asset_file: reward.animationData.file,
                extra_params: JSON.stringify({
                    frameWidth: reward.animationData.extraParams.frameWidth,
                    frameHeight: reward.animationData.extraParams.frameHeight
                })
            }]
        };
    }

}

module.exports.Reward = Reward;
