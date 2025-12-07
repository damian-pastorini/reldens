/**
 *
 * Reldens - SkillsSkillPhysicalDataModel
 *
 */

class SkillsSkillPhysicalDataModel
{

    constructor(id, skill_id, magnitude, objectWidth, objectHeight, validateTargetOnHit)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.magnitude = magnitude;
        this.objectWidth = objectWidth;
        this.objectHeight = objectHeight;
        this.validateTargetOnHit = validateTargetOnHit;
    }

    static get tableName()
    {
        return 'skills_skill_physical_data';
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

module.exports.SkillsSkillPhysicalDataModel = SkillsSkillPhysicalDataModel;
