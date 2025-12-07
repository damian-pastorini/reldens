/**
 *
 * Reldens - SkillsSkillOwnerConditionsModel
 *
 */

class SkillsSkillOwnerConditionsModel
{

    constructor(id, skill_id, key, property_key, conditional, value)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.key = key;
        this.property_key = property_key;
        this.conditional = conditional;
        this.value = value;
    }

    static get tableName()
    {
        return 'skills_skill_owner_conditions';
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

module.exports.SkillsSkillOwnerConditionsModel = SkillsSkillOwnerConditionsModel;
