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
            let rewardData = {
                id: reward.id,
                [RewardsConst.MESSAGE.DATA.LABEL]: reward.label,
                [RewardsConst.MESSAGE.DATA.DESCRIPTION]: reward.description,
                [RewardsConst.MESSAGE.DATA.POSITION]: reward.position,
            };
            if(reward.showRewardImage && reward.rewardImage){
                rewardData[RewardsConst.MESSAGE.DATA.SHOW_REWARD_IMAGE] = reward.showRewardImage;
                rewardData[RewardsConst.MESSAGE.DATA.REWARD_IMAGE] = reward.rewardImage;
                if(reward.rewardImagePath){
                    rewardData[RewardsConst.MESSAGE.DATA.REWARD_IMAGE_PATH] = reward.rewardImagePath;
                }
            }
            if(reward.eventData && 0 < Object.keys(reward.eventData).length){
                rewardData[RewardsConst.MESSAGE.DATA.EVENT_DATA] = reward.eventData;
                if(reward.itemsData){
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
                }
            }
            if(reward.eventState && 0 < Object.keys(reward.eventState).length){
                rewardData[RewardsConst.MESSAGE.DATA.STATE_DATA] = reward.eventState.mappedState;
            }
            return rewardData;
        });
    }

}

module.exports.RewardsToActionsMapper = RewardsToActionsMapper;
