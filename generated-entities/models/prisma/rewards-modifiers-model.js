/**
 *
 * Reldens - RewardsModifiersModel
 *
 */

class RewardsModifiersModel
{

    constructor(id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty)
    {
        this.id = id;
        this.key = key;
        this.property_key = property_key;
        this.operation = operation;
        this.value = value;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.minProperty = minProperty;
        this.maxProperty = maxProperty;
    }

    static get tableName()
    {
        return 'rewards_modifiers';
    }
    

    static get relationTypes()
    {
        return {
            rewards: 'many',
            operation_types: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_operation_types': 'operation_types',
            'related_rewards': 'rewards'
        };
    }
}

module.exports.RewardsModifiersModel = RewardsModifiersModel;
