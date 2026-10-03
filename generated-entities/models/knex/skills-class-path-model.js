/**
 *
 * Reldens - SkillsClassPathModel
 *
 */

class SkillsClassPathModel
{

    static get tableName()
    {
        return 'skills_class_path';
    }

    static get relationMappings()
    {
        return {
            related_skills_levels_set: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_levels_set',
                from: 'levels_set_id',
                to: 'id'
            },
            related_skills_class_level_up_animations: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_level_up_animations',
                from: 'id',
                to: 'class_path_id'
            },
            related_skills_class_path_level_labels: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_path_level_labels',
                from: 'id',
                to: 'class_path_id'
            },
            related_skills_class_path_level_skills: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_path_level_skills',
                from: 'id',
                to: 'class_path_id'
            },
            related_skills_owners_class_path: {
                relation: 'HasManyRelation',
                tableName: 'skills_owners_class_path',
                from: 'id',
                to: 'class_path_id'
            }
        };
    }
}

module.exports.SkillsClassPathModel = SkillsClassPathModel;
