/**
 *
 * Reldens - StatsRecoveryCalculator
 *
 * Increases every configured stat by its amount without passing its maximum value, and returns the keys of the stats
 * that changed. With a start delay, a stat recovers only when the delay passed since it was last seen lowered: the
 * recovery state keeps the value left by the previous recovery of every stat, a lower value (or a stat seen for the
 * first time) restarts its delay, so a stat never recovers while it keeps taking damage. While its owner is in battle
 * no stat recovers, and the first recovery that sees the battle ended restarts every delay, so the delay counts from
 * the battle end (the state keeps "inBattle" only while the owner is in battle).
 *
 */

const { sc } = require('@reldens/utils');

class StatsRecoveryCalculator
{

    /**
     * @param {Object} stats
     * @param {Object} maxStats
     * @param {Object} amounts
     * @param {Object} [recoveryState]
     * @param {Object} [recoveryTiming]
     * @param {number} [recoveryTiming.startDelayMs]
     * @param {number} [recoveryTiming.now]
     * @param {boolean} [recoveryTiming.inBattle]
     * @returns {Array<string>}
     */
    static recover(stats, maxStats, amounts, recoveryState = {lastValues: {}, loweredAt: {}}, recoveryTiming = {})
    {
        let recoveredProperties = [];
        if(!stats || !maxStats || !amounts){
            return recoveredProperties;
        }
        let inBattle = Boolean(sc.get(recoveryTiming, 'inBattle', false));
        let battleEnded = !inBattle && true === recoveryState.inBattle;
        if(battleEnded){
            delete recoveryState.inBattle;
        }
        if(inBattle){
            recoveryState.inBattle = true;
        }
        let delayTiming = {
            now: Number(sc.get(recoveryTiming, 'now', 0)),
            startDelayMs: Number(sc.get(recoveryTiming, 'startDelayMs', 0)),
            restartDelays: inBattle || battleEnded
        };
        for(let propertyKey of Object.keys(amounts)){
            let currentValue = Number(stats[propertyKey]);
            let maxValue = Number(maxStats[propertyKey]);
            let amount = Number(amounts[propertyKey]);
            if(
                this.isRecoveryStarted(currentValue, propertyKey, recoveryState, delayTiming)
                && !inBattle
                && this.canRecover(currentValue, maxValue, amount)
            ){
                stats[propertyKey] = Math.min(maxValue, currentValue + amount);
                recoveredProperties.push(propertyKey);
            }
            recoveryState.lastValues[propertyKey] = Number(stats[propertyKey]);
        }
        return recoveredProperties;
    }

    /**
     * @param {number} currentValue
     * @param {string} propertyKey
     * @param {Object} recoveryState
     * @param {Object} delayTiming
     * @param {number} delayTiming.now
     * @param {number} delayTiming.startDelayMs
     * @param {boolean} delayTiming.restartDelays
     * @returns {boolean}
     */
    static isRecoveryStarted(currentValue, propertyKey, recoveryState, delayTiming)
    {
        if(
            delayTiming.restartDelays
            || !sc.hasOwn(recoveryState.lastValues, propertyKey)
            || currentValue < recoveryState.lastValues[propertyKey]
        ){
            recoveryState.loweredAt[propertyKey] = delayTiming.now;
        }
        return delayTiming.now - recoveryState.loweredAt[propertyKey] >= delayTiming.startDelayMs;
    }

    /**
     * @param {number} currentValue
     * @param {number} maxValue
     * @param {number} amount
     * @returns {boolean}
     */
    static canRecover(currentValue, maxValue, amount)
    {
        return Number.isFinite(currentValue)
            && Number.isFinite(maxValue)
            && Number.isFinite(amount)
            && 0 < amount
            && currentValue < maxValue;
    }

}

module.exports.StatsRecoveryCalculator = StatsRecoveryCalculator;
