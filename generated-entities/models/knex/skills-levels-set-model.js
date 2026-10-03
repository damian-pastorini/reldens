/**
 *
 * Reldens - SkillsLevelsSetModel
 *
 */

class SkillsLevelsSetModel
{

    static get tableName()
    {
        return 'skills_levels_set';
    }

    static get relationMappings()
    {
        return {
            related_skills_class_path: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_path',
                from: 'id',
                to: 'levels_set_id'
            },
            related_skills_levels: {
                relation: 'HasManyRelation',
                tableName: 'skills_levels',
                from: 'id',
                to: 'level_set_id'
            }
        };
    }
}

module.exports.SkillsLevelsSetModel = SkillsLevelsSetModel;
