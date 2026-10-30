/**
 *
 * Reldens - ScoresPeriodKeyBuilder
 *
 * Builds the key of the scores period a date belongs to, in UTC: "daily" is the date (2026-10-17), "weekly" is the ISO
 * week (2026-W42) and "monthly" is the month (2026-10). Two dates of the same period always get the same key.
 *
 */

const { ScoresConst } = require('../constants');

class ScoresPeriodKeyBuilder
{

    /**
     * @param {string} period
     * @param {Date} date
     * @returns {string|boolean}
     */
    static build(period, date)
    {
        if(!(date instanceof Date)){
            return false;
        }
        if(!Number.isFinite(date.getTime())){
            return false;
        }
        if(ScoresConst.RESET.PERIODS.DAILY === period){
            return date.toISOString().slice(0, ScoresConst.RESET.TIME.ISO_DATE_LENGTH);
        }
        if(ScoresConst.RESET.PERIODS.WEEKLY === period){
            return this.weeklyKey(date);
        }
        if(ScoresConst.RESET.PERIODS.MONTHLY === period){
            return date.toISOString().slice(0, ScoresConst.RESET.TIME.ISO_MONTH_LENGTH);
        }
        return false;
    }

    /**
     * @param {Date} date
     * @returns {string}
     */
    static weeklyKey(date)
    {
        let weekThursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        let isoWeekDay = weekThursday.getUTCDay() || ScoresConst.RESET.TIME.DAYS_PER_WEEK;
        weekThursday.setUTCDate(weekThursday.getUTCDate() + ScoresConst.RESET.TIME.ISO_WEEK_THURSDAY - isoWeekDay);
        return weekThursday.getUTCFullYear()+ScoresConst.RESET.TIME.WEEK_PREFIX+String(Math.ceil(
            (
                (weekThursday.getTime() - Date.UTC(weekThursday.getUTCFullYear(), 0, 1))
                / ScoresConst.RESET.TIME.MS_PER_DAY
                + 1
            ) / ScoresConst.RESET.TIME.DAYS_PER_WEEK
        )).padStart(ScoresConst.RESET.TIME.WEEK_DIGITS, '0');
    }

}

module.exports.ScoresPeriodKeyBuilder = ScoresPeriodKeyBuilder;
