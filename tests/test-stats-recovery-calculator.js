/**
 *
 * Reldens - Test Stats Recovery Calculator
 *
 */

const { BaseTest } = require('./base-test');
const { StatsRecoveryCalculator } = require('../lib/actions/server/stats-recovery-calculator');

class TestStatsRecoveryCalculator extends BaseTest
{

    createDelayedRecovery(stats, maxStats, amounts, startDelayMs = 1000)
    {
        let delayedRecovery = {recoveryState: {lastValues: {}, loweredAt: {}}};
        delayedRecovery.recoverAt = (now, inBattle = false) => StatsRecoveryCalculator.recover(
            stats,
            maxStats,
            amounts,
            delayedRecovery.recoveryState,
            {startDelayMs, now, inBattle}
        );
        return delayedRecovery;
    }

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

    async testMissingDataKeepsTheRecoveryStateUntouched()
    {
        await this.test('missing stats, maximums or amounts never change the recovery state', async () => {
            let missingStats = this.createDelayedRecovery(false, {hp: 100}, {hp: 5});
            let missingMaximums = this.createDelayedRecovery({hp: 1}, false, {hp: 5});
            let missingAmounts = this.createDelayedRecovery({hp: 1}, {hp: 100}, false);
            for(let delayedRecovery of [missingStats, missingMaximums, missingAmounts]){
                this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), []);
                this.assert.deepStrictEqual(delayedRecovery.recoveryState, {lastValues: {}, loweredAt: {}});
            }
        });
    }

    async testZeroDelayRecoversOnTheFirstTick()
    {
        await this.test('a zero start delay recovers a stat on the first tick that sees it', async () => {
            let stats = {hp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5}, 0);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(500), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 55});
            this.assert.deepStrictEqual(delayedRecovery.recoveryState, {lastValues: {hp: 55}, loweredAt: {hp: 500}});
        });
    }

    async testStatSeenForTheFirstTimeWaitsTheDelay()
    {
        await this.test('a stat seen for the first time recovers only when the start delay passed', async () => {
            let stats = {hp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), []);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(999), []);
            this.assert.deepStrictEqual(stats, {hp: 50});
            this.assert.deepStrictEqual(delayedRecovery.recoveryState, {lastValues: {hp: 50}, loweredAt: {hp: 0}});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1000), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 55});
            this.assert.deepStrictEqual(delayedRecovery.recoveryState, {lastValues: {hp: 55}, loweredAt: {hp: 0}});
        });
    }

    async testStatKeepsRecoveringOnEveryTickAfterTheDelay()
    {
        await this.test('a stat that is not lowered again keeps recovering on every tick after the delay', async () => {
            let stats = {hp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), []);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1000), ['hp']);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1500), ['hp']);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(2000), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 65});
        });
    }

    async testLoweredStatRestartsTheDelay()
    {
        await this.test('a stat lowered after the delay passed waits the whole delay again', async () => {
            let stats = {hp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5});
            delayedRecovery.recoverAt(0);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1000), ['hp']);
            stats.hp = 40;
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1500), []);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(2499), []);
            this.assert.deepStrictEqual(stats, {hp: 40});
            this.assert.deepStrictEqual(delayedRecovery.recoveryState.loweredAt, {hp: 1500});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(2500), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 45});
        });
    }

    async testDamageSmallerThanTheRecoveredAmountRestartsTheDelay()
    {
        await this.test('a damage smaller than the recovered amount is still seen and restarts the delay', async () => {
            let stats = {hp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5});
            delayedRecovery.recoverAt(0);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1000), ['hp']);
            stats.hp = 54;
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1500), []);
            this.assert.deepStrictEqual(delayedRecovery.recoveryState, {lastValues: {hp: 54}, loweredAt: {hp: 1500}});
        });
    }

    async testEveryStatKeepsItsOwnDelay()
    {
        await this.test('only the lowered stat waits the delay again, the other stats keep recovering', async () => {
            let stats = {hp: 50, mp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100, mp: 100}, {hp: 5, mp: 5});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), []);
            stats.hp = 30;
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1000), ['mp']);
            this.assert.deepStrictEqual(stats, {hp: 30, mp: 55});
            this.assert.deepStrictEqual(delayedRecovery.recoveryState.loweredAt, {hp: 1000, mp: 0});
        });
    }

    async testFullStatIsRememberedAndItsDamageWaitsTheDelay()
    {
        await this.test('a full stat is remembered without recovering and a later damage waits the delay', async () => {
            let stats = {hp: 100};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), []);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(2000), []);
            this.assert.deepStrictEqual(delayedRecovery.recoveryState, {lastValues: {hp: 100}, loweredAt: {hp: 0}});
            stats.hp = 90;
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(3000), []);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(4000), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 95});
        });
    }

    async testRaisedStatDoesNotRestartTheDelay()
    {
        await this.test('a stat raised by something else, like an item, never restarts the delay', async () => {
            let stats = {hp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), []);
            stats.hp = 70;
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1000), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 75});
        });
    }

    async testInvalidStatIsRememberedWithoutRecovering()
    {
        await this.test('an invalid stat value is never recovered and never breaks the other stats', async () => {
            let stats = {hp: 'none', mp: 50};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100, mp: 100}, {hp: 5, mp: 5}, 0);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), ['mp']);
            this.assert.deepStrictEqual(stats, {hp: 'none', mp: 55});
            this.assert.ok(Number.isNaN(delayedRecovery.recoveryState.lastValues.hp));
        });
    }

    async testNoStatRecoversInBattle()
    {
        await this.test('no stat recovers in battle, with a zero delay or after the delay passed', async () => {
            for(let startDelayMs of [0, 1000]){
                let stats = {hp: 50, mp: 50};
                let maxStats = {hp: 100, mp: 100};
                let delayedRecovery = this.createDelayedRecovery(stats, maxStats, {hp: 5, mp: 5}, startDelayMs);
                this.assert.deepStrictEqual(delayedRecovery.recoverAt(0, true), []);
                this.assert.deepStrictEqual(delayedRecovery.recoverAt(5000, true), []);
                this.assert.deepStrictEqual(stats, {hp: 50, mp: 50});
                this.assert.deepStrictEqual(
                    delayedRecovery.recoveryState,
                    {lastValues: {hp: 50, mp: 50}, loweredAt: {hp: 5000, mp: 5000}, inBattle: true}
                );
            }
        });
    }

    async testDelayCountsFromTheBattleEnd()
    {
        await this.test('after the battle every stat waits the whole delay counted from the battle end', async () => {
            let stats = {hp: 50, mp: 100};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100, mp: 100}, {hp: 5, mp: 5});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0), []);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(3000, true), []);
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(3500), []);
            this.assert.deepStrictEqual(
                delayedRecovery.recoveryState,
                {lastValues: {hp: 50, mp: 100}, loweredAt: {hp: 3500, mp: 3500}}
            );
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(4499), []);
            this.assert.deepStrictEqual(stats, {hp: 50, mp: 100});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(4500), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 55, mp: 100});
            this.assert.deepStrictEqual(
                delayedRecovery.recoveryState,
                {lastValues: {hp: 55, mp: 100}, loweredAt: {hp: 3500, mp: 3500}}
            );
        });
    }

    async testFullStatInBattleIsRemembered()
    {
        await this.test('a full stat in battle is remembered and a later damage waits the delay', async () => {
            let stats = {hp: 100};
            let delayedRecovery = this.createDelayedRecovery(stats, {hp: 100}, {hp: 5});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(0, true), []);
            stats.hp = 80;
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(1000), []);
            this.assert.deepStrictEqual(delayedRecovery.recoveryState, {lastValues: {hp: 80}, loweredAt: {hp: 1000}});
            this.assert.deepStrictEqual(delayedRecovery.recoverAt(2000), ['hp']);
            this.assert.deepStrictEqual(stats, {hp: 85});
        });
    }

}

module.exports.TestStatsRecoveryCalculator = TestStatsRecoveryCalculator;
