/**
 *
 * Reldens - Test Rewards Events Message Actions
 *
 */

const { BaseTest } = require('./base-test');
const { RewardsAcceptBuilder } = require('./fixtures/rewards-accept-builder');
const { RewardsConst } = require('../lib/rewards/constants');

class TestRewardsEventsMessageActions extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.rewardsBuilder = new RewardsAcceptBuilder();
        this.playerId = 7;
        this.otherPlayerId = 8;
        this.readyState = {ready: true, date: '2026-10-28', complete: false};
    }

    expectedGivenItem(playerId)
    {
        return {
            playerId,
            itemKey: this.rewardsBuilder.rewardItem.key,
            quantity: this.rewardsBuilder.rewardItemQuantity
        };
    }

    expectedSavedStates(playerId)
    {
        return [
            {
                playerId,
                state: Object.assign({}, this.readyState, {givenItems: {[this.rewardsBuilder.rewardItem.key]: true}})
            },
            {playerId, state: Object.assign({}, this.readyState, {complete: true})}
        ];
    }

    assertNothingGiven(setup)
    {
        this.assert.deepStrictEqual(setup.givenItems, []);
        this.assert.deepStrictEqual(setup.savedStates, []);
        this.assert.deepStrictEqual(setup.sentMessages, []);
    }

    async testReadyRewardIsGivenAndStoredAsComplete()
    {
        await this.test('a ready reward gives its items, is stored as complete and is sent as accepted', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: this.readyState});
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), true);
            this.assert.deepStrictEqual(setup.givenItems, [this.expectedGivenItem(this.playerId)]);
            this.assert.deepStrictEqual(setup.savedStates, this.expectedSavedStates(this.playerId));
            this.assert.deepStrictEqual(setup.sentMessages.map(message => message.act), [
                RewardsConst.ACTIONS.ACCEPTED_REWARD,
                RewardsConst.ACTIONS.UPDATE
            ]);
        });
    }

    async testRewardThatIsNotReadyGivesNothing()
    {
        await this.test('a reward that is not ready gives nothing even when its accept message is sent', async () => {
            let notReadyStates = [
                {ready: false, date: '2026-10-28', complete: false},
                {date: '2026-10-28', complete: false},
                {}
            ];
            for(let notReadyState of notReadyStates){
                let setup = this.rewardsBuilder.build({[this.playerId]: notReadyState});
                this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), false);
                this.assertNothingGiven(setup);
            }
        });
    }

    async testCompletedRewardGivesNothing()
    {
        await this.test('a completed reward gives nothing again', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: Object.assign({}, this.readyState, {complete: true})});
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), false);
            this.assertNothingGiven(setup);
        });
    }

    async testOverlappingAcceptMessagesGiveTheRewardOnce()
    {
        await this.test('two overlapping accept messages of a player give the reward once', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: this.readyState});
            let results = await Promise.all([
                this.rewardsBuilder.accept(setup, this.playerId),
                this.rewardsBuilder.accept(setup, this.playerId)
            ]);
            this.assert.deepStrictEqual(results, [true, false]);
            this.assert.deepStrictEqual(setup.givenItems, [this.expectedGivenItem(this.playerId)]);
            this.assert.deepStrictEqual(setup.savedStates, this.expectedSavedStates(this.playerId));
            this.assert.strictEqual(setup.sentMessages.length, 2);
        });
    }

    async testOverlappingAcceptMessagesOfTwoPlayersGiveBothRewards()
    {
        await this.test('overlapping accept messages of two players give the reward to each player', async () => {
            let setup = this.rewardsBuilder.build({
                [this.playerId]: this.readyState,
                [this.otherPlayerId]: this.readyState
            });
            let results = await Promise.all([
                this.rewardsBuilder.accept(setup, this.playerId),
                this.rewardsBuilder.accept(setup, this.otherPlayerId)
            ]);
            this.assert.deepStrictEqual(results, [true, true]);
            this.assert.deepStrictEqual(
                setup.givenItems.map(givenItem => givenItem.playerId).sort(),
                [this.playerId, this.otherPlayerId]
            );
            this.assert.deepStrictEqual(
                setup.savedStates.filter(savedState => this.playerId === savedState.playerId),
                this.expectedSavedStates(this.playerId)
            );
            this.assert.deepStrictEqual(
                setup.savedStates.filter(savedState => this.otherPlayerId === savedState.playerId),
                this.expectedSavedStates(this.otherPlayerId)
            );
        });
    }

    async testPartiallyGivenRewardGivesOnlyTheMissingItems()
    {
        await this.test('a claim that failed after some items gives only the missing items when claimed again', async () => {
            let rewardItems = {coins: 1, gems: 2};
            let setup = this.rewardsBuilder.build(
                {[this.playerId]: this.readyState},
                {rewardItems, rejectedItems: ['gems']}
            );
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), false);
            this.assert.deepStrictEqual(setup.givenItems, [{playerId: this.playerId, itemKey: 'coins', quantity: 1}]);
            this.assert.deepStrictEqual(setup.savedStates, [{
                playerId: this.playerId,
                state: Object.assign({}, this.readyState, {givenItems: {coins: true}})
            }]);
            this.assert.deepStrictEqual(setup.sentMessages, []);
            setup.options.rejectedItems = [];
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), true);
            this.assert.deepStrictEqual(setup.givenItems.map(givenItem => givenItem.itemKey), Object.keys(rewardItems));
            this.assert.deepStrictEqual([...setup.savedStates].pop(), {
                playerId: this.playerId,
                state: Object.assign({}, this.readyState, {complete: true})
            });
        });
    }

    async testItemNotAddedKeepsTheRewardClaimable()
    {
        await this.test('an item that the inventory does not add keeps the reward claimable', async () => {
            let setup = this.rewardsBuilder.build(
                {[this.playerId]: this.readyState},
                {notAddedItems: [this.rewardsBuilder.rewardItem.key]}
            );
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), false);
            this.assertNothingGiven(setup);
        });
    }

    async testFailedStateSaveAfterAnItemIsNotAccepted()
    {
        await this.test('a state save that fails after a given item is never sent as accepted', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: this.readyState}, {saveFails: true});
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), false);
            this.assert.deepStrictEqual(setup.givenItems, [this.expectedGivenItem(this.playerId)]);
            this.assert.deepStrictEqual(setup.savedStates, []);
            this.assert.deepStrictEqual(setup.sentMessages, []);
        });
    }

    async testFailedItemsGiveKeepsTheRewardClaimable()
    {
        await this.test('a failed items give is not sent as accepted and keeps the reward claimable', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: this.readyState}, {giveRejects: true});
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), false);
            this.assertNothingGiven(setup);
            setup.options.giveRejects = false;
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), true);
            this.assert.deepStrictEqual(setup.givenItems, [this.expectedGivenItem(this.playerId)]);
        });
    }

    async testRejectedStateLoadKeepsTheNextAcceptWorking()
    {
        await this.test('a rejected state load gives nothing and the next accept of the player still runs', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: this.readyState}, {loadRejects: true});
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), false);
            this.assertNothingGiven(setup);
            setup.options.loadRejects = false;
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), true);
            this.assert.deepStrictEqual(setup.givenItems, [this.expectedGivenItem(this.playerId)]);
        });
    }

    async testRewardWithoutStateGivesNothing()
    {
        await this.test('a reward without a stored state gives nothing and only sends the rewards update', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: false});
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId), true);
            this.assert.deepStrictEqual(setup.givenItems, []);
            this.assert.deepStrictEqual(setup.savedStates, []);
            this.assert.deepStrictEqual(
                setup.sentMessages.map(message => message.act),
                [RewardsConst.ACTIONS.UPDATE]
            );
        });
    }

    async testOtherActionsAreIgnored()
    {
        await this.test('a message that is not a rewards action or not an accept is ignored', async () => {
            let setup = this.rewardsBuilder.build({[this.playerId]: this.readyState});
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId, 'otherAction'), false);
            this.assert.strictEqual(await this.rewardsBuilder.accept(setup, this.playerId, RewardsConst.PREFIX), false);
            this.assertNothingGiven(setup);
        });
    }

}

module.exports.TestRewardsEventsMessageActions = TestRewardsEventsMessageActions;
