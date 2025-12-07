/**
 *
 * Reldens - SkillsLevelsModel
 *
 */

class SkillsLevelsModel
{

    constructor(id, key, label, required_experience, level_set_id)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.required_experience = required_experience;
        this.level_set_id = level_set_id;
    }

    static get tableName()
    {
        return 'skills_levels';
    }
    

    static get relationTypes()
    {
        return {
            skills_class_level_up_animations: 'many',
            skills_class_path_level_labels: 'many',
            skills_class_path_level_skills: 'many',
            skills_levels_set: 'one',
            skills_levels_modifiers: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_levels_set': 'skills_levels_set',
            'related_skills_class_level_up_animations': 'skills_class_level_up_animations',
            'related_skills_class_path_level_labels': 'skills_class_path_level_labels',
            'related_skills_class_path_level_skills': 'skills_class_path_level_skills',
            'related_skills_levels_modifiers': 'skills_levels_modifiers'
        };
    }
}

module.exports.SkillsLevelsModel = SkillsLevelsModel;
