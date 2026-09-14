/**
 *
 * Reldens - SkillsSkillAnimationsModel
 *
 */

class SkillsSkillAnimationsModel
{

    static get tableName()
    {
        return 'skills_skill_animations';
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

module.exports.SkillsSkillAnimationsModel = SkillsSkillAnimationsModel;
