/**
 *
 * Reldens - Test Rewards Subscriber
 *
 * Tests the rewards subscriber splits, the unique rewards, the failed grants, and the rewards plugin started with the
 * teams feature disabled (ISSUE #300): no teams plugin, and the reward goes to the killer alone, also with a team ID
 * left on it.
 *
 */

const { BaseTest } = require('./base-test');
const { RewardsSubscriber } = require('../lib/rewards/server/subscribers/rewards-subscriber');
const { RewardsPlugin } = require('../lib/rewards/server/plugin');
const { Reward } = require('../lib/rewards/server/reward');
const { RewardsConst } = require('../lib/rewards/constants');

class TestRewardsSubscriber extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.randomPicksCount = 20;
    }

    createSubscriber(rewardsGeneralConfig)
    {
        return new RewardsSubscriber({
            featuresManager: {config: {getWithoutLogs: () => rewardsGeneralConfig}}
        });
    }

    createTarget(playerId, currentLevel, addedItems, addedExperience)
    {
        return {
            player_id: playerId,
            stats: {hp: 50},
            statsBase: {hp: 100},
            inventory: {
                manager: {
                    createItemInstance: (itemKey, quantity) => ({itemKey, quantity, playerId}),
                    addItem: async (itemInstance) => addedItems.push(itemInstance)
                }
            },
            skillsServer: {
                classPath: {
                    currentLevel,
                    addExperience: async (experience) => addedExperience.push({playerId, experience})
                }
            }
        };
    }

    createTeamTargets(addedItems, addedExperience)
    {
        return {
            12: this.createTarget(12, 1, addedItems, addedExperience),
            35: this.createTarget(35, 3, addedItems, addedExperience)
        };
    }

    createHealPotionModifierReward()
    {
        return new Reward({
            id: 1,
            modifierId: 2,
            dropRate: 100,
            dropQuantity: 1,
            modifier: {
                id: 2,
                key: 'heal_potion_20',
                property_key: 'stats/hp',
                operation: 1,
                value: '20',
                maxProperty: 'statsBase/hp'
            }
        });
    }

    async collectRandomPicks(pickCallback)
    {
        let picks = [];
        for(let i = 0; i < this.randomPicksCount; i++){
            picks.push(await pickCallback());
        }
        return picks;
    }

    async testTheRandomModifierSplitGivesTheRewardToTheOnlyTarget()
    {
        await this.test('the random modifier split gives the reward to the only target keyed by player ID', async () => {
            let subscriber = this.createSubscriber({splitModifier: RewardsConst.SPLIT_MODIFIER.RANDOM});
            let rewardedHitPoints = await this.collectRandomPicks(async () => {
                let target = this.createTarget(12, 1, [], []);
                await subscriber.applyModifierReward(this.createHealPotionModifierReward(), {12: target});
                return target.stats.hp;
            });
            this.assert.deepStrictEqual(rewardedHitPoints, new Array(this.randomPicksCount).fill(70));
        });
    }

    async testTheRandomModifierSplitGivesTheRewardToOneOfTheTeamTargets()
    {
        await this.test('the random modifier split gives the reward to exactly one of the team targets', async () => {
            let subscriber = this.createSubscriber({splitModifier: RewardsConst.SPLIT_MODIFIER.RANDOM});
            let rewardedTotals = await this.collectRandomPicks(async () => {
                let targets = this.createTeamTargets([], []);
                await subscriber.applyModifierReward(this.createHealPotionModifierReward(), targets);
                return targets[12].stats.hp + targets[35].stats.hp;
            });
            this.assert.deepStrictEqual(rewardedTotals, new Array(this.randomPicksCount).fill(120));
        });
    }

    async testTheAllModifierSplitGivesTheRewardToEveryTarget()
    {
        await this.test('the all modifier split gives the reward to every team target', async () => {
            let subscriber = this.createSubscriber({splitModifier: RewardsConst.SPLIT_MODIFIER.ALL});
            let targets = this.createTeamTargets([], []);
            await subscriber.applyModifierReward(this.createHealPotionModifierReward(), targets);
            this.assert.deepStrictEqual([targets[12].stats.hp, targets[35].stats.hp], [70, 70]);
        });
    }

    async testTheItemRewardIsAddedToOneOfTheTargets()
    {
        await this.test('the item reward is added to the inventory of one of the team targets', async () => {
            let subscriber = this.createSubscriber({});
            let addedItems = [];
            let targets = this.createTeamTargets(addedItems, []);
            let reward = new Reward({id: 3, itemId: 2, dropRate: 100, dropQuantity: 3, item: {id: 2, key: 'branch'}});
            await this.collectRandomPicks(async () => await subscriber.applyItemReward(reward, targets, []));
            let rewardedPlayers = addedItems.map((addedItem) => addedItem.playerId);
            this.assert.strictEqual(addedItems.length, this.randomPicksCount);
            this.assert.strictEqual(addedItems.shift().itemKey, 'branch');
            this.assert.deepStrictEqual(rewardedPlayers.filter((playerId) => 12 !== playerId && 35 !== playerId), []);
        });
    }

    createUniqueRewardsSetup(rewardsProps)
    {
        let setup = {subscriber: this.createSubscriber({}), storedUpdates: []};
        setup.dataServer = {getEntity: () => ({updateById: async (id, patch) => setup.storedUpdates.push({id, patch})})};
        setup.rewards = rewardsProps.map((rewardProps) => new Reward(
            Object.assign({itemId: 2, dropRate: 100, dropQuantity: 1, item: {id: 2, key: 'branch'}}, rewardProps)
        ));
        return setup;
    }

    async testAGivenUniqueRewardIsStoredOnceAndNotWonAgain()
    {
        await this.test('a given unique reward is stored as given once and the same object does not give it again', async () => {
            let setup = this.createUniqueRewardsSetup([{id: 4, isUnique: 1}, {id: 5}]);
            this.assert.deepStrictEqual(setup.subscriber.getWinningRewards(setup.rewards).map(reward => reward.id), [4, 5]);
            await setup.subscriber.updateUniqueRewards(setup.rewards, setup.dataServer);
            await setup.subscriber.updateUniqueRewards(setup.rewards, setup.dataServer);
            this.assert.deepStrictEqual(setup.storedUpdates, [{id: 4, patch: {was_given: 1}}]);
            this.assert.deepStrictEqual(setup.subscriber.getWinningRewards(setup.rewards).map(reward => reward.id), [5]);
        });
    }

    async testAUniqueRewardWonByOneInstanceIsNotWonByAnotherInstance()
    {
        await this.test('a unique reward won by one object instance is not won by another live instance, even before it is stored', async () => {
            let firstInstance = this.createUniqueRewardsSetup([{id: 4, isUnique: 1}, {id: 5}]);
            let otherInstanceRewards = this.createUniqueRewardsSetup([{id: 4, isUnique: 1}, {id: 5}]).rewards;
            this.assert.deepStrictEqual(firstInstance.subscriber.getWinningRewards(firstInstance.rewards).map(reward => reward.id), [4, 5]);
            this.assert.deepStrictEqual(firstInstance.subscriber.getWinningRewards(otherInstanceRewards).map(reward => reward.id), [5]);
            this.assert.strictEqual(otherInstanceRewards[0].wasGiven, false);
        });
    }

    async testAUniqueRewardStoredAsGivenIsNotWon()
    {
        await this.test('a unique reward loaded as given is never won and is not stored again', async () => {
            let setup = this.createUniqueRewardsSetup([{id: 4, isUnique: 1, wasGiven: 1}]);
            this.assert.deepStrictEqual(setup.subscriber.getWinningRewards(setup.rewards), []);
            await setup.subscriber.updateUniqueRewards(setup.rewards, setup.dataServer);
            this.assert.deepStrictEqual(setup.storedUpdates, []);
        });
    }

    createGrantSetup(rewardsProps, grantBehavior)
    {
        let setup = this.createUniqueRewardsSetup(rewardsProps);
        setup.addedItems = [];
        setup.addedExperience = [];
        let target = this.createTarget(12, 1, setup.addedItems, setup.addedExperience);
        target.inventory.manager.addItem = async (itemInstance) => {
            if(grantBehavior.isInventoryFull){
                return false;
            }
            return setup.addedItems.push(itemInstance);
        };
        target.skillsServer.classPath.addExperience = async (experience) => {
            if(grantBehavior.isExperienceSaveFailing){
                return Promise.reject(new Error('Experience save failed.'));
            }
            return setup.addedExperience.push(experience);
        };
        setup.subscriber.targetDeterminer = {forReward: () => ({12: target})};
        setup.giveRewards = async () => await setup.subscriber.giveRewards(
            target,
            {rewards: setup.rewards, dataServer: setup.dataServer},
            {emit: async () => true}
        );
        return setup;
    }

    async testAUniqueRewardWithAFailedItemGivesNothingAndIsReleased()
    {
        await this.test('a unique reward whose item fails gives no experience, is released and a later kill gives it once', async () => {
            let rewardsProps = [{id: 4, isUnique: 1, experience: 30}];
            let behavior = {isInventoryFull: true};
            let setup = this.createGrantSetup(rewardsProps, behavior);
            await setup.giveRewards();
            this.assert.deepStrictEqual(
                [setup.addedItems.length, setup.addedExperience, setup.storedUpdates, setup.rewards[0].wasGiven],
                [0, [], [], false]
            );
            this.assert.strictEqual(setup.subscriber.isAvailableReward(setup.rewards[0]), true);
            behavior.isInventoryFull = false;
            await setup.giveRewards();
            await setup.giveRewards();
            this.assert.deepStrictEqual(
                [setup.addedItems.length, setup.addedExperience, setup.storedUpdates, setup.rewards[0].wasGiven],
                [1, [30], [{id: 4, patch: {was_given: 1}}], true]
            );
        });
    }

    async testAPartlyGivenUniqueRewardStaysGiven()
    {
        await this.test('a unique reward whose experience save throws after its item was given stays given and stored', async () => {
            let setup = this.createGrantSetup([{id: 4, isUnique: 1, experience: 30}], {isExperienceSaveFailing: true});
            await setup.giveRewards();
            this.assert.deepStrictEqual(
                [setup.addedItems.length, setup.storedUpdates, setup.rewards[0].wasGiven],
                [1, [{id: 4, patch: {was_given: 1}}], true]
            );
            this.assert.strictEqual(setup.subscriber.isAvailableReward(setup.rewards[0]), false);
            await setup.giveRewards();
            this.assert.strictEqual(setup.addedItems.length, 1);
        });
    }

    async testAThrowingGrantStillGivesTheNextRewards()
    {
        await this.test('a unique reward whose only step throws is released and the next winning rewards are still given', async () => {
            let setup = this.createGrantSetup(
                [{id: 4, isUnique: 1, itemId: null, item: null, experience: 30}, {id: 5, isUnique: 1}],
                {isExperienceSaveFailing: true}
            );
            await setup.giveRewards();
            this.assert.deepStrictEqual(
                [setup.addedItems.length, setup.storedUpdates, setup.rewards.map(reward => reward.wasGiven)],
                [1, [{id: 5, patch: {was_given: 1}}], [false, true]]
            );
            this.assert.deepStrictEqual(
                setup.rewards.map(reward => setup.subscriber.isAvailableReward(reward)),
                [true, false]
            );
        });
    }

    async testTheTeamsFeatureDisabledGivesTheRewardToTheKillerAlone()
    {
        await this.test('with the teams feature disabled the plugin starts and the reward goes to the killer alone', async () => {
            let featuresManager = {config: {getWithoutLogs: () => ({})}, featuresList: {rewards: {package: {}}}};
            let rewardsPlugin = new RewardsPlugin();
            await rewardsPlugin.appendPluginClasses({featuresManager});
            let addedItems = [];
            let killer = this.createTarget(12, 1, addedItems, []);
            killer.currentTeam = 35;
            await rewardsPlugin.rewardsSubscriber.giveRewards(
                killer,
                {
                    rewards: [new Reward({id: 3, itemId: 2, dropRate: 100, dropQuantity: 1, item: {id: 2, key: 'branch'}})],
                    dataServer: {getEntity: () => ({updateById: async () => true})}
                },
                {emit: async () => true}
            );
            this.assert.deepStrictEqual(
                [
                    Boolean(rewardsPlugin.rewardsSubscriber.teamsPlugin),
                    rewardsPlugin.targetDeterminer.forReward(killer),
                    addedItems.map(addedItem => [addedItem.itemKey, addedItem.playerId])
                ],
                [false, {12: killer}, [['branch', 12]]]
            );
        });
    }

    async testTheExperienceIsSplitInEqualParts()
    {
        await this.test('the all experience split gives every target the same part', async () => {
            let subscriber = this.createSubscriber({splitExperience: RewardsConst.SPLIT_EXPERIENCE.ALL});
            let addedExperience = [];
            await subscriber.applyExperienceReward(
                new Reward({id: 3, experience: 10}),
                this.createTeamTargets([], addedExperience)
            );
            this.assert.deepStrictEqual(addedExperience, [{playerId: 12, experience: 5}, {playerId: 35, experience: 5}]);
        });
    }

    async testTheExperienceIsSplitByLevel()
    {
        await this.test('the proportional experience split gives every target its levels share', async () => {
            let subscriber = this.createSubscriber({splitExperience: RewardsConst.SPLIT_EXPERIENCE.PROPORTIONAL_BY_LEVEL});
            let addedExperience = [];
            await subscriber.applyExperienceReward(
                new Reward({id: 3, experience: 10}),
                this.createTeamTargets([], addedExperience)
            );
            this.assert.deepStrictEqual(
                addedExperience,
                [{playerId: 12, experience: 2.5}, {playerId: 35, experience: 7.5}]
            );
        });
    }

}

module.exports.TestRewardsSubscriber = TestRewardsSubscriber;
