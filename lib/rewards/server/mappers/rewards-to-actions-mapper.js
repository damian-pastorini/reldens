/**
 *
 * Reldens - RewardsToActionsMapper
 *
 */

const { RewardsConst } = require('../../constants');

class RewardsToActionsMapper
{

    map(rewards)
    {
        // reduce the amount of data sent to the client by sending only the required fields:
        return rewards.map((reward) => {
            return this.mapSingle(reward);
        });
    }

    mapSingle(reward)
    {
        let rewardData = {
            id: reward.id,
            [RewardsConst.MESSAGE.DATA.LABEL]: reward.label,
            [RewardsConst.MESSAGE.DATA.DESCRIPTION]: reward.description,
            [RewardsConst.MESSAGE.DATA.POSITION]: reward.position,
        };
        this.mapRewardImageData(reward, rewardData);
        this.mapRewardEventData(reward, rewardData);
        this.mapRewardEventStateData(reward, rewardData);
        return rewardData;
    }

    mapRewardEventStateData(reward, rewardData)
    {
        if(!reward.eventState || 0 === Object.keys(reward.eventState).length){
            return rewardData;
        }
        rewardData[RewardsConst.MESSAGE.DATA.STATE_DATA] = reward.eventState.mappedState;
        return rewardData;
    }

    mapRewardEventData(reward, rewardData)
    {
        if(!reward.eventData || 0 === Object.keys(reward.eventData).length){
            return rewardData;
        }
        rewardData[RewardsConst.MESSAGE.DATA.EVENT_DATA] = reward.eventData;
        this.mapRewardItemsData(reward, rewardData);
        return rewardData;
    }

    mapRewardImageData(reward, rewardData)
    {
        if(!reward.showRewardImage || !reward.rewardImage){
            return rewardData;
        }
        rewardData[RewardsConst.MESSAGE.DATA.SHOW_REWARD_IMAGE] = reward.showRewardImage;
        rewardData[RewardsConst.MESSAGE.DATA.REWARD_IMAGE] = reward.rewardImage;
        if(reward.rewardImagePath){
            rewardData[RewardsConst.MESSAGE.DATA.REWARD_IMAGE_PATH] = reward.rewardImagePath;
        }
        return rewardData;
    }

    mapRewardItemsData(reward, rewardData)
    {
        if(!reward.itemsData){
            return rewardData;
        }
        let itemsIds = Object.keys(reward.itemsData);
        let mappedItemsData = [];
        for(let itemId of itemsIds){
            let item = reward.itemsData[itemId];
            mappedItemsData.push({
                id: itemId,
                [RewardsConst.MESSAGE.DATA.ITEM_LABEL]: item.label,
                [RewardsConst.MESSAGE.DATA.ITEM_DESCRIPTION]: item.description,
                [RewardsConst.MESSAGE.DATA.ITEM_KEY]: item.key,
                [RewardsConst.MESSAGE.DATA.ITEM_QUANTITY]: item.rewardQuantity,
            });
        }
        rewardData[RewardsConst.MESSAGE.DATA.ITEMS_DATA] = mappedItemsData;
        delete rewardData[RewardsConst.MESSAGE.DATA.EVENT_DATA].items;
        return rewardData;
    }
}

module.exports.RewardsToActionsMapper = RewardsToActionsMapper;
