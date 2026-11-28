/**
 *
 * Reldens - ScoresPeriodKeyBuilder
 *
 * Builds the key of the scores period a date belongs to, in the server local time: "daily" is the date (2026-10-17),
 * "weekly" is the date of the week Monday with the week mark (2026-10-12-W) and "monthly" is the month (2026-10). Two
 * dates of the same period always get the same key, the keys of one period sort by time, and each period has its own
 * key format. The week Monday is built from the local date parts, so a daylight saving change never moves a date to
 * another week.
 *
 */

const { ScoresConst } = require('../constants');
const { sc } = require('@reldens/utils');

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
            return sc.formatDate(date, ScoresConst.RESET.TIME.DAILY_KEY_FORMAT);
        }
        if(ScoresConst.RESET.PERIODS.WEEKLY === period){
            return sc.formatDate(
                new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate() - (date.getDay() + ScoresConst.RESET.TIME.DAYS_PER_WEEK - 1)
                        % ScoresConst.RESET.TIME.DAYS_PER_WEEK
                ),
                ScoresConst.RESET.TIME.WEEKLY_KEY_FORMAT
            );
        }
        if(ScoresConst.RESET.PERIODS.MONTHLY === period){
            return sc.formatDate(date, ScoresConst.RESET.TIME.MONTHLY_KEY_FORMAT);
        }
        return false;
    }

}

module.exports.ScoresPeriodKeyBuilder = ScoresPeriodKeyBuilder;
