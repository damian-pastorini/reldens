/**
 *
 * Reldens - SkillTypeModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillTypeModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_type';
    }

}

module.exports.SkillTypeModel = SkillTypeModel;
