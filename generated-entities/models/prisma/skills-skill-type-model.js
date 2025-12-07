/**
 *
 * Reldens - SkillsSkillTypeModel
 *
 */

class SkillsSkillTypeModel
{

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
    }

    static get tableName()
    {
        return 'skills_skill_type';
    }
    

    static get relationTypes()
    {
        return {
            skills_skill: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill': 'skills_skill'
        };
    }
}

module.exports.SkillsSkillTypeModel = SkillsSkillTypeModel;
