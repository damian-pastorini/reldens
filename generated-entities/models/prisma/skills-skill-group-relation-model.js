/**
 *
 * Reldens - SkillsSkillGroupRelationModel
 *
 */

class SkillsSkillGroupRelationModel
{

    constructor(id, skill_id, group_id)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.group_id = group_id;
    }

    static get tableName()
    {
        return 'skills_skill_group_relation';
    }
    

    static get relationTypes()
    {
        return {
            skills_groups: 'one',
            skills_skill: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill': 'skills_skill',
            'related_skills_groups': 'skills_groups'
        };
    }
}

module.exports.SkillsSkillGroupRelationModel = SkillsSkillGroupRelationModel;
