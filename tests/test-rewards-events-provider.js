/**
 *
 * Reldens - Test Rewards Events Provider
 *
 */

const { BaseTest } = require('./base-test');
const { RewardsEventsProvider } = require('../lib/rewards/server/rewards-events-provider');

class TestRewardsEventsProvider extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.dailyLoginEventData = '{"action":"dailyLogin","items":{"coins":1}}';
    }

    createProvider(rewardsConfig)
    {
        return new RewardsEventsProvider({
            config: {getWithoutLogs: () => rewardsConfig},
            dataServer: {getEntity: () => ({})}
        });
    }

    async testTheEventWithoutImageGetsTheConfiguredDefaultPath()
    {
        await this.test('a reward event without its own image gets the configured default image path', async () => {
            let provider = this.createProvider({
                showRewardImage: true,
                defaultRewardImage: 'daily-login.png',
                defaultRewardImagePath: '/assets/custom/rewards-events/'
            });
            let rewardEvent = await provider.mapRewardDataFromModel({id: 1, event_data: this.dailyLoginEventData});
            this.assert.strictEqual(rewardEvent.showRewardImage, true);
            this.assert.strictEqual(rewardEvent.rewardImage, 'daily-login.png');
            this.assert.strictEqual(rewardEvent.rewardImagePath, '/assets/custom/rewards-events/');
        });
    }

    async testTheEventWithoutConfigGetsTheBuiltInDefaultPath()
    {
        await this.test('without a configured path the reward event gets the built in default image path', async () => {
            let rewardEvent = await this.createProvider({}).mapRewardDataFromModel({
                id: 1,
                event_data: this.dailyLoginEventData
            });
            this.assert.strictEqual(rewardEvent.rewardImage, 'default-reward.png');
            this.assert.strictEqual(rewardEvent.rewardImagePath, '/assets/custom/rewards/');
        });
    }

    async testTheEventImagePathOverridesTheDefault()
    {
        await this.test('a reward event with its own image path keeps it', async () => {
            let provider = this.createProvider({showRewardImage: true, defaultRewardImagePath: '/assets/custom/rewards/'});
            let rewardEvent = await provider.mapRewardDataFromModel({
                id: 2,
                event_data: '{"action":"straightDaysLogin","days":2,"rewardImagePath":"/assets/custom/streak/"}'
            });
            this.assert.strictEqual(rewardEvent.rewardImagePath, '/assets/custom/streak/');
        });
    }

}

module.exports.TestRewardsEventsProvider = TestRewardsEventsProvider;
