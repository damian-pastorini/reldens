/**
 *
 * Reldens - SkillsClassPathLevelSkillsModel
 *
 */

class SkillsClassPathLevelSkillsModel
{

    constructor(id, class_path_id, level_id, skill_id)
    {
        this.id = id;
        this.class_path_id = class_path_id;
        this.level_id = level_id;
        this.skill_id = skill_id;
    }

    static get tableName()
    {
        return 'skills_class_path_level_skills';
    }
    

    static get relationTypes()
    {
        return {
            skills_class_path: 'one',
            skills_levels: 'one',
            skills_skill: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_class_path': 'skills_class_path',
            'related_skills_levels': 'skills_levels',
            'related_skills_skill': 'skills_skill'
        };
    }
}

module.exports.SkillsClassPathLevelSkillsModel = SkillsClassPathLevelSkillsModel;
