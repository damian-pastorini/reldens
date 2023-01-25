const { Reward } = require('./reward');

class RewardsMapper
{
    static fromModels(rewardsModels)
    {
        if (0 === rewardsModels.length) {
            return [];
        }

        let mapped = [];
        for (let rewardModel of rewardsModels) {
            mapped.push(Reward.fromModel(rewardModel));
        }
        return mapped;
    }
}

module.exports.RewardsMapper = RewardsMapper;