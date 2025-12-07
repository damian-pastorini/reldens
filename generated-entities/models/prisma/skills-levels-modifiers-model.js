/**
 *
 * Reldens - SkillsLevelsModifiersModel
 *
 */

class SkillsLevelsModifiersModel
{

    constructor(id, level_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty)
    {
        this.id = id;
        this.level_id = level_id;
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
        return 'skills_levels_modifiers';
    }
    

    static get relationTypes()
    {
        return {
            operation_types: 'one',
            skills_levels: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_levels': 'skills_levels',
            'related_operation_types': 'operation_types'
        };
    }
}

module.exports.SkillsLevelsModifiersModel = SkillsLevelsModifiersModel;
