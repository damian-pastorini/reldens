/**
 *
 * Reldens - SendInitialRewardsData
 *
 */

const { RewardsEventsProvider } = require('../rewards-events-provider');
const { RewardsEventsSender } = require('../rewards-events-sender');

class SendInitialRewardsData
{

    constructor(props)
    {
        this.rewardsProvider = new RewardsEventsProvider(props);
        this.rewardsSender = new RewardsEventsSender();
    }

    async execute(room, client, playerSchema)
    {
        return this.rewardsSender.sendUpdates(
            room,
            playerSchema,
            await this.rewardsProvider.fetchPlayerActiveRewards(playerSchema.player_id)
        );
    }

}

module.exports.SendInitialRewardsData = SendInitialRewardsData;
