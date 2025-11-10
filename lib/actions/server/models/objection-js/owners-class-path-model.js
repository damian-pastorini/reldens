/**
 *
 * Reldens - Skills - OwnersClassPathModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class OwnersClassPathModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'owners_class_path';
    }

    static get relationMappings()
    {
        const { ClassPathModel } = require('./class-path-model');
        return {
            owner_full_class_path: {
                relation: this.HasOneRelation,
                modelClass: ClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: ClassPathModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.OwnersClassPathModel = OwnersClassPathModel;
