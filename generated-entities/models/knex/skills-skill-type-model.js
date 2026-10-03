/**
 *
 * Reldens - SkillsSkillTypeModel
 *
 */

class SkillsSkillTypeModel
{

    static get tableName()
    {
        return 'skills_skill_type';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill',
                from: 'id',
                to: 'type'
            }
        };
    }
}

module.exports.SkillsSkillTypeModel = SkillsSkillTypeModel;
