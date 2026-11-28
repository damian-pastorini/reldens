/**
 *
 * Reldens - Test Scores Period Key Builder
 *
 * Tests the scores period keys in the server local time (every date is built with the local Date constructor, so the
 * expected keys are the same in any server time zone): the daily key is the local date, the first local hour of a day
 * included, the weekly key is the local date of the week Monday with the week mark (2026-10-12-W), across the year
 * change and the daylight saving changes,
 * the monthly key is the local year and month, and an unknown period or an invalid date gives no key.
 *
 */

const { BaseTest } = require('./base-test');
const { ScoresPeriodKeyBuilder } = require('../lib/scores/server/scores-period-key-builder');
const { ScoresConst } = require('../lib/scores/constants');

class TestScoresPeriodKeyBuilder extends BaseTest
{

    async testDailyKeyIsTheLocalDate()
    {
        await this.test('the daily key is the local date, its first local hour included', async () => {
            let daily = ScoresConst.RESET.PERIODS.DAILY;
            this.assert.deepStrictEqual(
                [
                    ScoresPeriodKeyBuilder.build(daily, new Date(2026, 9, 17, 23, 59, 59)),
                    ScoresPeriodKeyBuilder.build(daily, new Date(2026, 9, 18, 0, 0, 0)),
                    ScoresPeriodKeyBuilder.build(daily, new Date(2026, 9, 18, 0, 30, 0))
                ],
                ['2026-10-17', '2026-10-18', '2026-10-18']
            );
        });
    }

    async testWeeklyKeyIsTheWeekMonday()
    {
        await this.test('every local day from monday to sunday gets the key of the week monday date', async () => {
            let weekly = ScoresConst.RESET.PERIODS.WEEKLY;
            this.assert.deepStrictEqual(
                [
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 9, 12, 0, 0, 0)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 9, 17, 12, 0, 0)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 9, 18, 23, 59, 59)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 9, 19, 0, 0, 0))
                ],
                ['2026-10-12-W', '2026-10-12-W', '2026-10-12-W', '2026-10-19-W']
            );
        });
    }

    async testWeeklyKeyAcrossTheDaylightSavingChanges()
    {
        await this.test('a daylight saving change never moves a local date to another week', async () => {
            let weekly = ScoresConst.RESET.PERIODS.WEEKLY;
            this.assert.deepStrictEqual(
                [
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 2, 29, 23, 59, 59)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 2, 30, 0, 0, 0)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 9, 25, 23, 59, 59)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 9, 26, 0, 0, 0))
                ],
                ['2026-03-23-W', '2026-03-30-W', '2026-10-19-W', '2026-10-26-W']
            );
        });
    }

    async testWeeklyKeyAcrossTheYearChange()
    {
        await this.test('the weeks across the year change get the date of their monday, in the year it falls', async () => {
            let weekly = ScoresConst.RESET.PERIODS.WEEKLY;
            this.assert.deepStrictEqual(
                [
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2025, 11, 29, 0, 0, 0)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2026, 0, 1, 0, 0, 0)),
                    ScoresPeriodKeyBuilder.build(weekly, new Date(2027, 0, 1, 0, 0, 0))
                ],
                ['2025-12-29-W', '2025-12-29-W', '2026-12-28-W']
            );
        });
    }

    async testMonthlyKeyIsTheLocalMonth()
    {
        await this.test('the monthly key is the local year and month', async () => {
            let monthly = ScoresConst.RESET.PERIODS.MONTHLY;
            this.assert.deepStrictEqual(
                [
                    ScoresPeriodKeyBuilder.build(monthly, new Date(2026, 9, 1, 0, 0, 0)),
                    ScoresPeriodKeyBuilder.build(monthly, new Date(2026, 9, 31, 23, 59, 59)),
                    ScoresPeriodKeyBuilder.build(monthly, new Date(2026, 10, 1, 0, 0, 0))
                ],
                ['2026-10', '2026-10', '2026-11']
            );
        });
    }

    async testInvalidPeriodOrDateGivesNoKey()
    {
        await this.test('an unknown period or an invalid date gives no key', async () => {
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build('yearly', new Date(2026, 9, 17, 0, 0, 0)), false);
            this.assert.strictEqual(
                ScoresPeriodKeyBuilder.build(ScoresConst.RESET.PERIODS.DAILY, new Date('not a date')),
                false
            );
            this.assert.strictEqual(ScoresPeriodKeyBuilder.build(ScoresConst.RESET.PERIODS.DAILY, '2026-10-17'), false);
        });
    }

}

module.exports.TestScoresPeriodKeyBuilder = TestScoresPeriodKeyBuilder;
