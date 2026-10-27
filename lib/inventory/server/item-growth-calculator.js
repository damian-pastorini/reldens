/**
 *
 * Reldens - ItemGrowthCalculator
 *
 * The growth maths of an item: the item share of the experience gained by its owner, the item level reached with its
 * accumulated experience ("levels" maps every level to its required experience, the levels never go down) and the
 * modifier value of a level (the original value increased by the configured percent on every level after the first).
 *
 */

const { InventoryConst } = require('../constants');

class ItemGrowthCalculator
{

    /**
     * @param {number} experienceShare
     * @param {number} experienceAdded
     * @returns {number}
     */
    static experienceFor(experienceShare, experienceAdded)
    {
        let share = Number.isFinite(Number(experienceShare))
            ? Number(experienceShare)
            : InventoryConst.GROWTH.PERCENT_BASE;
        let addedExperience = Number(experienceAdded);
        if(!Number.isFinite(share) || !Number.isFinite(addedExperience)){
            return 0;
        }
        if(0 >= share || 0 >= addedExperience){
            return 0;
        }
        return Math.floor(addedExperience * share / InventoryConst.GROWTH.PERCENT_BASE);
    }

    /**
     * @param {number} experience
     * @param {Object<string, number>} levels
     * @param {number} currentLevel
     * @returns {number}
     */
    static levelFor(experience, levels, currentLevel)
    {
        let reachedLevel = Number(currentLevel) || InventoryConst.GROWTH.DEFAULT_LEVEL;
        if(!levels){
            return reachedLevel;
        }
        for(let levelKey of Object.keys(levels)){
            let level = Number(levelKey);
            if(level > reachedLevel && Number(experience) >= Number(levels[levelKey])){
                reachedLevel = level;
            }
        }
        return reachedLevel;
    }

    /**
     * @param {number} originalValue
     * @param {number} level
     * @param {number} increasePercentPerLevel
     * @returns {number}
     */
    static scaledValue(originalValue, level, increasePercentPerLevel)
    {
        return Math.round(Number(originalValue) * (
            InventoryConst.GROWTH.PERCENT_BASE
            + Math.max(0, Number(level) - InventoryConst.GROWTH.DEFAULT_LEVEL) * (Number(increasePercentPerLevel) || 0)
        ) / InventoryConst.GROWTH.PERCENT_BASE);
    }

}

module.exports.ItemGrowthCalculator = ItemGrowthCalculator;
