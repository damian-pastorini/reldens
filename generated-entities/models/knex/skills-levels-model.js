/**
 *
 * Reldens - SkillsLevelsModel
 *
 */

class SkillsLevelsModel
{

    static get tableName()
    {
        return 'skills_levels';
    }

    static get relationMappings()
    {
        return {
            related_skills_levels_set: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_levels_set',
                from: 'level_set_id',
                to: 'id'
            },
            related_skills_class_level_up_animations: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_level_up_animations',
                from: 'id',
                to: 'level_id'
            },
            related_skills_class_path_level_labels: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_path_level_labels',
                from: 'id',
                to: 'level_id'
            },
            related_skills_class_path_level_skills: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_path_level_skills',
                from: 'id',
                to: 'level_id'
            },
            related_skills_levels_modifiers: {
                relation: 'HasManyRelation',
                tableName: 'skills_levels_modifiers',
                from: 'id',
                to: 'level_id'
            }
        };
    }
}

module.exports.SkillsLevelsModel = SkillsLevelsModel;
