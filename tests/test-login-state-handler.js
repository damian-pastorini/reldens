/**
 *
 * Reldens - Test Login State Handler
 *
 */

const { BaseTest } = require('./base-test');
const { LoginStateHandler } = require('../lib/rewards/server/event-handlers/login-state-handler');
const { sc } = require('@reldens/utils');

class TestLoginStateHandler extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.rewardId = 1;
        this.playerId = 7;
        this.stateId = 101;
        this.claimDate = '2026-10-27';
        this.nextDate = '2026-10-28';
        this.givenItems = {coins: true};
    }

    async resetState(storedState, isReady, today)
    {
        let savedStates = [];
        let loginStateHandler = new LoginStateHandler({
            rewardsProvider: {},
            rewardsEventsUpdater: {
                updateStateById: async (stateId, state, rewardId, playerId) => {
                    savedStates.push({isNewState: !stateId, state: sc.toJson(state, {}), rewardId, playerId});
                    return true;
                }
            },
            config: {getWithoutLogs: (path, defaultValue) => defaultValue}
        });
        await loginStateHandler.resetRewardState(
            null === storedState ? null : {id: this.stateId, state: sc.toJsonString(storedState)},
            isReady,
            today,
            {id: this.rewardId},
            {loggedPlayer: {player_id: this.playerId}}
        );
        return savedStates;
    }

    async testNewClaimDateClearsThePartialClaimItems()
    {
        await this.test('a new claim date clears the items given by a partial claim of the previous date', async () => {
            let storedState = {ready: true, date: this.claimDate, complete: false, givenItems: this.givenItems};
            this.assert.deepStrictEqual(await this.resetState(storedState, true, this.nextDate), [{
                isNewState: false,
                state: {ready: true, date: this.nextDate, complete: false},
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

    async testSameClaimDateKeepsThePartialClaimItems()
    {
        await this.test('the same claim date keeps the items given by a partial claim', async () => {
            let storedState = {ready: true, date: this.nextDate, complete: false, givenItems: this.givenItems};
            this.assert.deepStrictEqual(await this.resetState(storedState, true, this.nextDate), [{
                isNewState: false,
                state: storedState,
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

    async testNotReadyResetKeepsTheDateAndTheItems()
    {
        await this.test('a not ready reset keeps the stored claim date and the given items', async () => {
            let storedState = {ready: true, date: this.claimDate, complete: true, givenItems: this.givenItems};
            this.assert.deepStrictEqual(await this.resetState(storedState, false, false), [{
                isNewState: false,
                state: {ready: false, date: this.claimDate, complete: false, givenItems: this.givenItems},
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

    async testRewardWithoutStoredStateIsCreated()
    {
        await this.test('a reward without stored state is created ready on the claim date', async () => {
            this.assert.deepStrictEqual(await this.resetState(null, true, this.nextDate), [{
                isNewState: true,
                state: {ready: true, date: this.nextDate, complete: false},
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

}

module.exports.TestLoginStateHandler = TestLoginStateHandler;
