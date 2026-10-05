/**
 *
 * Reldens - SkillsClassPathLevelSkillsModel
 *
 */

class SkillsClassPathLevelSkillsModel
{

    static get tableName()
    {
        return 'skills_class_path_level_skills';
    }

    static get relationMappings()
    {
        return {
            related_skills_class_path: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_class_path',
                from: 'class_path_id',
                to: 'id'
            },
            related_skills_levels: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_levels',
                from: 'level_id',
                to: 'id'
            },
            related_skills_skill: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill',
                from: 'skill_id',
                to: 'id'
            }
        };
    }
}

module.exports.SkillsClassPathLevelSkillsModel = SkillsClassPathLevelSkillsModel;
