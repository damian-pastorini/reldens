/**
 *
 * Reldens - SkillsClassPathModel
 *
 */

class SkillsClassPathModel
{

    constructor(id, key, label, levels_set_id, enabled, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.levels_set_id = levels_set_id;
        this.enabled = enabled;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'skills_class_path';
    }
    

    static get relationTypes()
    {
        return {
            skills_class_level_up_animations: 'many',
            skills_levels_set: 'one',
            skills_class_path_level_labels: 'many',
            skills_class_path_level_skills: 'many',
            skills_owners_class_path: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_levels_set': 'skills_levels_set',
            'related_skills_class_level_up_animations': 'skills_class_level_up_animations',
            'related_skills_class_path_level_labels': 'skills_class_path_level_labels',
            'related_skills_class_path_level_skills': 'skills_class_path_level_skills',
            'related_skills_owners_class_path': 'skills_owners_class_path'
        };
    }
}

module.exports.SkillsClassPathModel = SkillsClassPathModel;
