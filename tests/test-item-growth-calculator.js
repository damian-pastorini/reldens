/**
 *
 * Reldens - Test Item Growth Calculator
 *
 */

const { BaseTest } = require('./base-test');
const { ItemGrowthCalculator } = require('../lib/inventory/server/item-growth-calculator');

class TestItemGrowthCalculator extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.growingSwordGrowth = {
            experienceShare: 100,
            modifiersIncreasePercentPerLevel: 50,
            requireEquipped: true,
            levels: {'2': 5, '3': 30, '4': 90, '5': 200}
        };
        this.growingSwordAttack = 10;
    }

    async testItemExperienceIsTheShareOfTheOwnerExperience()
    {
        await this.test('the item experience is the configured share of the experience gained', async () => {
            this.assert.strictEqual(ItemGrowthCalculator.experienceFor(this.growingSwordGrowth.experienceShare, 40), 40);
            this.assert.strictEqual(ItemGrowthCalculator.experienceFor(50, 7), 3);
        });
    }

    async testMissingShareUsesTheWholeExperience()
    {
        await this.test('an item growth without experience share receives the whole experience', async () => {
            this.assert.strictEqual(ItemGrowthCalculator.experienceFor(this.growingSwordGrowth.missingShare, 40), 40);
        });
    }

    async testZeroShareOrInvalidExperienceGivesNothing()
    {
        await this.test('a zero share, a negative or an invalid experience gives no item experience', async () => {
            this.assert.strictEqual(ItemGrowthCalculator.experienceFor(0, 40), 0);
            this.assert.strictEqual(ItemGrowthCalculator.experienceFor(100, -5), 0);
            this.assert.strictEqual(ItemGrowthCalculator.experienceFor(100, 'many'), 0);
        });
    }

    async testLevelIsTheHighestReachedLevel()
    {
        await this.test('the item level is the highest level its experience reached', async () => {
            let levels = this.growingSwordGrowth.levels;
            this.assert.strictEqual(ItemGrowthCalculator.levelFor(4, levels, 1), 1);
            this.assert.strictEqual(ItemGrowthCalculator.levelFor(levels['2'], levels, 1), 2);
            this.assert.strictEqual(ItemGrowthCalculator.levelFor(levels['4'] + 5, levels, 1), 4);
            this.assert.strictEqual(ItemGrowthCalculator.levelFor(levels['5'] * 2, levels, 1), 5);
        });
    }

    async testLevelNeverGoesDown()
    {
        await this.test('the item level never goes below its current level', async () => {
            this.assert.strictEqual(ItemGrowthCalculator.levelFor(10, this.growingSwordGrowth.levels, 3), 3);
            this.assert.strictEqual(ItemGrowthCalculator.levelFor(10, false, 2), 2);
        });
    }

    async testModifierValueGrowsOnEveryLevel()
    {
        await this.test('the modifier value grows by the configured percent on every level after the first', async () => {
            let percent = this.growingSwordGrowth.modifiersIncreasePercentPerLevel;
            this.assert.strictEqual(ItemGrowthCalculator.scaledValue(this.growingSwordAttack, 1, percent), 10);
            this.assert.strictEqual(ItemGrowthCalculator.scaledValue(this.growingSwordAttack, 2, percent), 15);
            this.assert.strictEqual(ItemGrowthCalculator.scaledValue(this.growingSwordAttack, 5, percent), 30);
            this.assert.strictEqual(ItemGrowthCalculator.scaledValue(3, 2, percent), 5);
        });
    }

    async testModifierValueWithoutPercentKeepsTheOriginal()
    {
        await this.test('a growth without increase percent keeps the original modifier value', async () => {
            this.assert.strictEqual(ItemGrowthCalculator.scaledValue(this.growingSwordAttack, 4, false), 10);
        });
    }

}

module.exports.TestItemGrowthCalculator = TestItemGrowthCalculator;
