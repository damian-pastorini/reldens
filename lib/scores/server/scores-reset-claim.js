/**
 *
 * Reldens - ScoresResetClaim
 *
 * Reads the pending claim of a scores period reset from the stored last period key value
 * (`<periodKey>|resetting|{"claimedAt":<ms>,"scoresMaxId":<id>,"detailsMaxId":<id>}`), an empty object when the value
 * is a completed period key. Used by the period reset to wait or take over a claim and by the kill score to keep the
 * points earned while a reset is pending.
 *
 */

const { ScoresConst } = require('../constants');
const { sc } = require('@reldens/utils');

class ScoresResetClaim
{

    /**
     * @param {string} storedValue
     * @returns {Object}
     */
    static parse(storedValue)
    {
        if(!sc.isString(storedValue)){
            return {};
        }
        if(-1 === storedValue.indexOf(ScoresConst.RESET.PENDING_MARK)){
            return {};
        }
        return Object.assign(
            {},
            sc.toJson(storedValue.split(ScoresConst.RESET.PENDING_MARK).pop(), {}),
            {periodKey: storedValue.split(ScoresConst.RESET.PENDING_MARK).shift()}
        );
    }

    /**
     * @param {Object} configRepository
     * @returns {Promise<Object>}
     */
    static async loadPending(configRepository)
    {
        let lastPeriodRow = await configRepository.loadOne({
            scope: ScoresConst.RESET.LAST_PERIOD_KEY.SCOPE,
            path: ScoresConst.RESET.LAST_PERIOD_KEY.PATH
        });
        if(!lastPeriodRow){
            return {};
        }
        return this.parse(lastPeriodRow.value);
    }

}

module.exports.ScoresResetClaim = ScoresResetClaim;
