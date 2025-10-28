/**
 *
 * Reldens - SkillsLevelsModifiersConditionsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsLevelsModifiersConditionsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_levels_modifiers_conditions';
    }
    
}

module.exports.SkillsLevelsModifiersConditionsModel = SkillsLevelsModifiersConditionsModel;
