/**
 *
 * Reldens - SkillsClassPathLevelLabelsModel
 *
 */

class SkillsClassPathLevelLabelsModel
{

    constructor(id, class_path_id, level_id, label)
    {
        this.id = id;
        this.class_path_id = class_path_id;
        this.level_id = level_id;
        this.label = label;
    }

    static get tableName()
    {
        return 'skills_class_path_level_labels';
    }
    

    static get relationTypes()
    {
        return {
            skills_class_path: 'one',
            skills_levels: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_class_path': 'skills_class_path',
            'related_skills_levels': 'skills_levels'
        };
    }
}

module.exports.SkillsClassPathLevelLabelsModel = SkillsClassPathLevelLabelsModel;
