/**
 *
 * Reldens - ConfigTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ConfigTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'config_types';
    }

    static get relationMappings()
    {
        const { ConfigModel } = require('./config-model');
        return {
            related_config: {
                relation: this.HasManyRelation,
                modelClass: ConfigModel,
                join: {
                    from: this.tableName+'.id',
                    to: ConfigModel.tableName+'.type'
                }
            }
        };
    }
}

module.exports.ConfigTypesModel = ConfigTypesModel;
