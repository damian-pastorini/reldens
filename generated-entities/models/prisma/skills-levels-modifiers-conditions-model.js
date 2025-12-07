/**
 *
 * Reldens - SkillsLevelsModifiersConditionsModel
 *
 */

class SkillsLevelsModifiersConditionsModel
{

    constructor(id, levels_modifier_id, key, property_key, conditional, value)
    {
        this.id = id;
        this.levels_modifier_id = levels_modifier_id;
        this.key = key;
        this.property_key = property_key;
        this.conditional = conditional;
        this.value = value;
    }

    static get tableName()
    {
        return 'skills_levels_modifiers_conditions';
    }
    
}

module.exports.SkillsLevelsModifiersConditionsModel = SkillsLevelsModifiersConditionsModel;
