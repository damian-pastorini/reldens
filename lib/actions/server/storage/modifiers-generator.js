/**
 *
 * Reldens - Skills - ModifiersGenerator
 *
 * Generates modifier instances from database models.
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
            let modifier = new Modifier(modifierModel);
            modifiers.push(modifier);
        }
        return modifiers;
    }

}

module.exports.ModifiersGenerator = ModifiersGenerator;
