/**
 *
 * Reldens - SkillsSkillOwnerConditionsModel
 *
 */

class SkillsSkillOwnerConditionsModel
{

    static get tableName()
    {
        return 'skills_skill_owner_conditions';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill',
                from: 'skill_id',
                to: 'id'
            }
        };
    }
}

module.exports.SkillsSkillOwnerConditionsModel = SkillsSkillOwnerConditionsModel;
