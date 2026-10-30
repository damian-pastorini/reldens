/**
 *
 * Reldens - Test Stats Recovery Calculator
 *
 */

const { BaseTest } = require('./base-test');
const { StatsRecoveryCalculator } = require('../lib/actions/server/stats-recovery-calculator');

class TestStatsRecoveryCalculator extends BaseTest
{

    async testStatsAreRecoveredByTheirAmounts()
    {
        await this.test('every configured stat is increased by its amount', async () => {
            let stats = {hp: 50, mp: 20, atk: 10};
            let recovered = StatsRecoveryCalculator.recover(stats, {hp: 100, mp: 100, atk: 10}, {hp: 5, mp: 3});
            this.assert.deepStrictEqual(recovered, ['hp', 'mp']);
            this.assert.deepStrictEqual(stats, {hp: 55, mp: 23, atk: 10});
        });
    }

    async testRecoveryNeverPassesTheMaximum()
    {
        await this.test('the recovery stops on the stat maximum value', async () => {
            let stats = {hp: 98};
            StatsRecoveryCalculator.recover(stats, {hp: 100}, {hp: 5});
            this.assert.strictEqual(stats.hp, 100);
        });
    }

    async testFullOrInvalidStatsAreNotRecovered()
    {
        await this.test('full stats, missing maximums and invalid amounts are not recovered', async () => {
            let stats = {hp: 100, mp: 10, sp: 10};
            let recovered = StatsRecoveryCalculator.recover(
                stats,
                {hp: 100, sp: 50},
                {hp: 5, mp: 5, sp: 'many'}
            );
            this.assert.deepStrictEqual(recovered, []);
            this.assert.deepStrictEqual(stats, {hp: 100, mp: 10, sp: 10});
        });
    }

    async testNegativeAmountsNeverDamageTheStats()
    {
        await this.test('a negative or zero amount never changes the stat', async () => {
            let stats = {hp: 50, mp: 50};
            this.assert.deepStrictEqual(StatsRecoveryCalculator.recover(stats, {hp: 100, mp: 100}, {hp: -5, mp: 0}), []);
            this.assert.deepStrictEqual(stats, {hp: 50, mp: 50});
        });
    }

    async testMissingDataReturnsNoRecovery()
    {
        await this.test('missing stats, maximums or amounts recover nothing', async () => {
            this.assert.deepStrictEqual(StatsRecoveryCalculator.recover(false, {hp: 100}, {hp: 5}), []);
            this.assert.deepStrictEqual(StatsRecoveryCalculator.recover({hp: 1}, false, {hp: 5}), []);
            this.assert.deepStrictEqual(StatsRecoveryCalculator.recover({hp: 1}, {hp: 100}, false), []);
        });
    }

}

module.exports.TestStatsRecoveryCalculator = TestStatsRecoveryCalculator;
