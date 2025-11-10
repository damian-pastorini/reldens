/**
 *
 * Reldens - Skills - ConditionsGenerator
 *
 */

const { Condition } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

class ConditionsGenerator
{

    static fromConditionsModels(conditionsModels)
    {
        if(!sc.isArray(conditionsModels) || 0 === conditionsModels.length){
            return [];
        }
        let conditions = [];
        for(let conditionModel of conditionsModels){
            conditionModel['propertyKey'] = conditionModel['property_key'];
            let condition = new Condition(conditionModel);
            conditions.push(condition);
        }
        return conditions;
    }

}

module.exports.ConditionsGenerator = ConditionsGenerator;
