/**
 *
 * Reldens - ConfigModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ConfigModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'config';
    }
    
    static get relationMappings()
    {
        const { ConfigTypesModel } = require('./config-types-model');
        return {
            related_config_types: {
                relation: this.BelongsToOneRelation,
                modelClass: ConfigTypesModel,
                join: {
                    from: this.tableName+'.type',
                    to: ConfigTypesModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ConfigModel = ConfigModel;
