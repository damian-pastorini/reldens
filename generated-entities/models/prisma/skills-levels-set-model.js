/**
 *
 * Reldens - SkillsLevelsSetModel
 *
 */

class SkillsLevelsSetModel
{

    constructor(id, key, label, autoFillRanges, autoFillExperienceMultiplier, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.autoFillRanges = autoFillRanges;
        this.autoFillExperienceMultiplier = autoFillExperienceMultiplier;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'skills_levels_set';
    }
    

    static get relationTypes()
    {
        return {
            skills_class_path: 'many',
            skills_levels: 'many'
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

module.exports.SkillsLevelsSetModel = SkillsLevelsSetModel;
