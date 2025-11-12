/**
 *
 * Reldens - SkillsLevelsModifiersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsLevelsModifiersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_levels_modifiers';
    }
    
    static get relationMappings()
    {
        const { SkillsLevelsModel } = require('./skills-levels-model');
        const { OperationTypesModel } = require('./operation-types-model');
        return {
            related_skills_levels: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsLevelsModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: SkillsLevelsModel.tableName+'.id'
                }
            },
            related_operation_types: {
                relation: this.BelongsToOneRelation,
                modelClass: OperationTypesModel,
                join: {
                    from: this.tableName+'.operation',
                    to: OperationTypesModel.tableName+'.key'
                }
            }
        };
    }
}

module.exports.SkillsLevelsModifiersModel = SkillsLevelsModifiersModel;
