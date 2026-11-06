/**
 *
 * Reldens - Test Scores Period Key Builder
 *
 */

const { BaseTest } = require('./base-test');
const { ScoresPeriodKeyBuilder } = require('../lib/scores/server/scores-period-key-builder');
const { ScoresConst } = require('../lib/scores/constants');

class TestScoresPeriodKeyBuilder extends BaseTest
{

    async testDailyKeyIsTheUtcDate()
    {
        await this.test('the daily key is the UTC date', async () => {
            let daily = ScoresConst.RESET.PERIODS.DAILY;
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(daily, new Date('2026-10-17T23:59:59Z')), '2026-10-17');
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(daily, new Date('2026-10-18T02:30:00Z')), '2026-10-18');
        });
    }

    async testWeeklyKeyIsTheIsoWeek()
    {
        await this.test('every day from monday to sunday gets the same ISO week key', async () => {
            let weekly = ScoresConst.RESET.PERIODS.WEEKLY;
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(weekly, new Date('2026-10-12T00:00:00Z')), '2026-W42');
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(weekly, new Date('2026-10-17T12:00:00Z')), '2026-W42');
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(weekly, new Date('2026-10-18T23:59:59Z')), '2026-W42');
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(weekly, new Date('2026-10-19T00:00:00Z')), '2026-W43');
        });
    }

    async testWeeklyKeyAcrossTheYearChange()
    {
        await this.test('the weeks across the year change belong to the year of their thursday', async () => {
            let weekly = ScoresConst.RESET.PERIODS.WEEKLY;
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(weekly, new Date('2025-12-29T00:00:00Z')), '2026-W01');
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(weekly, new Date('2026-01-01T00:00:00Z')), '2026-W01');
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(weekly, new Date('2027-01-01T00:00:00Z')), '2026-W53');
        });
    }

    async testMonthlyKeyIsTheUtcMonth()
    {
        await this.test('the monthly key is the UTC year and month', async () => {
            let monthly = ScoresConst.RESET.PERIODS.MONTHLY;
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(monthly, new Date('2026-10-01T00:00:00Z')), '2026-10');
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(monthly, new Date('2026-10-31T23:59:59Z')), '2026-10');
        });
    }

    async testInvalidPeriodOrDateGivesNoKey()
    {
        await this.test('an unknown period or an invalid date gives no key', async () => {
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build('yearly', new Date('2026-10-17T00:00:00Z')), false);
            this.assert.strictEqual(
                ScoresPeriodKeyBuilder.build(ScoresConst.RESET.PERIODS.DAILY, new Date('not a date')),
                false
            );
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(ScoresConst.RESET.PERIODS.DAILY, '2026-10-17'), false);
        });
    }

}

module.exports.TestScoresPeriodKeyBuilder = TestScoresPeriodKeyBuilder;
