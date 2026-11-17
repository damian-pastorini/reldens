/**
 *
 * Reldens - Skills - ModifiersGenerator
 *
 * Generates modifier instances from database models. The effects minValue and maxValue columns are text, so a numeric
 * value is given to the Modifier as a number (it only applies a number limit) and a blank one as no limit; a maxValue
 * of 0 is no maximum, like the sample and the imported skills store it next to their maxProperty.
 *
 */

const { Modifier } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

class ModifiersGenerator
{

    /**
     * @param {Array} modifiersModels
     * @returns {Array}
     */
    static fromModifiersModels(modifiersModels)
    {
        if(!sc.isArray(modifiersModels) || 0 === modifiersModels.length){
            return [];
        }
        let modifiers = [];
        for(let modifierModel of modifiersModels){
            let modifier = new Modifier(Object.assign({}, modifierModel, {
                minValue: ModifiersGenerator.toLimitValue(modifierModel.minValue, true),
                maxValue: ModifiersGenerator.toLimitValue(modifierModel.maxValue, false)
            }));
            modifiers.push(modifier);
        }
        return modifiers;
    }

    /**
     * @param {string|number|null} storedLimit
     * @param {boolean} isZeroLimit
     * @returns {number|false}
     */
    static toLimitValue(storedLimit, isZeroLimit)
    {
        let limitValue = parseFloat(storedLimit);
        if(!Number.isFinite(limitValue) || (!isZeroLimit && 0 === limitValue)){
            return false;
        }
        return limitValue;
    }

}

module.exports.ModifiersGenerator = ModifiersGenerator;
