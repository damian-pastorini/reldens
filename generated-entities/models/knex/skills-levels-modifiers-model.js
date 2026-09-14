/**
 *
 * Reldens - SkillsLevelsModifiersModel
 *
 */

class SkillsLevelsModifiersModel
{

    static get tableName()
    {
        return 'skills_levels_modifiers';
    }

    static get relationMappings()
    {
        return {
            related_skills_levels: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_levels',
                from: 'level_id',
                to: 'id'
            },
            related_operation_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'operation_types',
                from: 'operation',
                to: 'key'
            }
        };
    }
}

module.exports.SkillsLevelsModifiersModel = SkillsLevelsModifiersModel;
