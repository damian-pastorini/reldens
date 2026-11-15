/**
 *
 * Reldens - Test Rewards Events Provider
 *
 */

const { BaseTest } = require('./base-test');
const { RewardsEventsProvider } = require('../lib/rewards/server/rewards-events-provider');
const { sc } = require('@reldens/utils');

class TestRewardsEventsProvider extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.dailyLoginEventData = '{"action":"dailyLogin","items":{"coins":1}}';
        this.playerId = 7;
        this.otherPlayerId = 8;
        this.pastDate = '2000-01-01 00:00:00';
        this.futureDate = '2999-01-01 00:00:00';
    }

    createProvider(rewardsConfig)
    {
        return new RewardsEventsProvider({
            config: {getWithoutLogs: () => rewardsConfig},
            dataServer: {getEntity: () => ({})}
        });
    }

    createProviderWithEvents(rewardsEvents, stateRows = [])
    {
        let setup = {loadCalls: []};
        let repositories = {
            rewardsEvents: {
                load: async (filters) => {
                    setup.loadCalls.push(filters);
                    return rewardsEvents.map(row => Object.assign({}, row));
                }
            },
            rewardsEventsState: {
                load: async (filters) => stateRows.filter(row => filters.player_id === row.player_id).map(
                    row => Object.assign({}, row)
                )
            },
            itemsItem: {load: async () => []}
        };
        setup.provider = new RewardsEventsProvider({
            config: {getWithoutLogs: () => ({})},
            dataServer: {getEntity: (entityName) => repositories[entityName]}
        });
        return setup;
    }

    async testCachedEventDatesAreCheckedOnEveryUpdate()
    {
        await this.test('an event whose end or start passes while the server runs leaves or joins the next update', async () => {
            let setup = this.createProviderWithEvents([
                {id: 1, event_data: this.dailyLoginEventData, active_from: null, active_to: null},
                {id: 2, event_data: this.dailyLoginEventData, active_from: null, active_to: this.futureDate},
                {id: 3, event_data: this.dailyLoginEventData, active_from: this.futureDate, active_to: null}
            ]);
            let listedRewards = await setup.provider.fetchPlayerActiveRewards(this.playerId);
            this.assert.deepStrictEqual(listedRewards.map(rewardEvent => rewardEvent.id), [1, 2]);
            let [, endingEvent, startingEvent] = setup.provider.activeRewardsEventsMappedData;
            endingEvent.active_to = this.pastDate;
            startingEvent.active_from = this.pastDate;
            listedRewards = await setup.provider.fetchPlayerActiveRewards(this.playerId);
            this.assert.deepStrictEqual(listedRewards.map(rewardEvent => rewardEvent.id), [1, 3]);
            this.assert.deepStrictEqual(setup.loadCalls, [{enabled: 1}]);
        });
    }

    async testActiveDatesIncludeBothLimits()
    {
        await this.test('an event is active from its start to its end, both included, and always with no dates', async () => {
            let provider = this.createProvider({});
            let currentDate = new Date(2026, 10, 14, 12, 0, 0);
            let before = new Date(currentDate.getTime() - 1);
            let after = new Date(currentDate.getTime() + 1);
            let cases = [
                [{}, true],
                [{active_from: null, active_to: null}, true],
                [{active_from: currentDate}, true],
                [{active_to: currentDate}, true],
                [{active_from: before, active_to: after}, true],
                [{active_from: after}, false],
                [{active_to: before}, false],
                [{active_from: after, active_to: before}, false],
                [{active_from: this.pastDate, active_to: this.futureDate}, true],
                [{active_to: this.pastDate}, false],
                [{active_from: this.futureDate}, false]
            ];
            for(let [rewardEvent, expected] of cases){
                this.assert.strictEqual(provider.isActiveByDates(rewardEvent, currentDate), expected, sc.toJsonString(rewardEvent));
            }
        });
    }

    async testEveryPlayerGetsOnlyItsOwnState()
    {
        await this.test('every player gets only its own reward state and the cached events keep none', async () => {
            let stateRow = {id: 5, rewards_events_id: 1, player_id: this.playerId, state: '{"ready":true,"complete":false}'};
            let setup = this.createProviderWithEvents([{id: 1, event_data: this.dailyLoginEventData}], [stateRow]);
            let [playerReward] = await setup.provider.fetchPlayerActiveRewards(this.playerId);
            this.assert.deepStrictEqual(playerReward.eventState.mappedState, {ready: true, complete: false});
            let [otherPlayerReward] = await setup.provider.fetchPlayerActiveRewards(this.otherPlayerId);
            this.assert.strictEqual(otherPlayerReward.eventState, false);
            let [noPlayerReward] = await setup.provider.fetchPlayerActiveRewards(false);
            this.assert.strictEqual(noPlayerReward.eventState, false);
            this.assert.strictEqual(sc.hasOwn(setup.provider.activeRewardsEventsMappedData[0], 'eventState'), false);
            this.assert.deepStrictEqual(
                (await setup.provider.fetchPlayerActiveRewards(this.playerId)).shift().eventState.mappedState,
                {ready: true, complete: false}
            );
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
