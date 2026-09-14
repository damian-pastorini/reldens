/**
 *
 * Reldens - SkillsSkillAttackModel
 *
 */

class SkillsSkillAttackModel
{

    static get tableName()
    {
        return 'skills_skill_attack';
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

module.exports.SkillsSkillAttackModel = SkillsSkillAttackModel;
