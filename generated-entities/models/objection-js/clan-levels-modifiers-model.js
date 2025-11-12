/**
 *
 * Reldens - ClanLevelsModifiersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ClanLevelsModifiersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'clan_levels_modifiers';
    }
    
    static get relationMappings()
    {
        const { ClanLevelsModel } = require('./clan-levels-model');
        const { OperationTypesModel } = require('./operation-types-model');
        return {
            related_clan_levels: {
                relation: this.BelongsToOneRelation,
                modelClass: ClanLevelsModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: ClanLevelsModel.tableName+'.id'
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

module.exports.ClanLevelsModifiersModel = ClanLevelsModifiersModel;
