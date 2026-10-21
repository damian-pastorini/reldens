/**
 *
 * Reldens - Test Rewards Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { RewardsSubscriber } = require('../lib/rewards/server/subscribers/rewards-subscriber');
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
