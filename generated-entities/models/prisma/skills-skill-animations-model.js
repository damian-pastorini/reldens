/**
 *
 * Reldens - SkillsSkillAnimationsModel
 *
 */

class SkillsSkillAnimationsModel
{

    constructor(id, skill_id, key, classKey, animationData)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.key = key;
        this.classKey = classKey;
        this.animationData = animationData;
    }

    static get tableName()
    {
        return 'skills_skill_animations';
    }
    

    static get relationTypes()
    {
        return {
            skills_skill: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill': 'skills_skill'
        };
    }
}

module.exports.SkillsSkillAnimationsModel = SkillsSkillAnimationsModel;
