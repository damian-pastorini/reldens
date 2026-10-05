/**
 *
 * Reldens - SkillsSkillPhysicalDataModel
 *
 */

class SkillsSkillPhysicalDataModel
{

    static get tableName()
    {
        return 'skills_skill_physical_data';
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

module.exports.SkillsSkillPhysicalDataModel = SkillsSkillPhysicalDataModel;
