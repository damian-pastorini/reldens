/**
 *
 * Reldens - Theme - StatsRecoveryCalculator
 *
 * Increases every configured stat by its amount without passing its maximum value, and returns the keys of the stats
 * that changed.
 *
 */

class StatsRecoveryCalculator
{

    /**
     * @param {Object} stats
     * @param {Object} maxStats
     * @param {Object} amounts
     * @returns {Array<string>}
     */
    static recover(stats, maxStats, amounts)
    {
        let recoveredProperties = [];
        if(!stats || !maxStats || !amounts){
            return recoveredProperties;
        }
        for(let propertyKey of Object.keys(amounts)){
            let currentValue = Number(stats[propertyKey]);
            let maxValue = Number(maxStats[propertyKey]);
            let amount = Number(amounts[propertyKey]);
            if(!this.canRecover(currentValue, maxValue, amount)){
                continue;
            }
            stats[propertyKey] = Math.min(maxValue, currentValue + amount);
            recoveredProperties.push(propertyKey);
        }
        return recoveredProperties;
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
