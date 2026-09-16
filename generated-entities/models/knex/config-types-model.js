/**
 *
 * Reldens - ConfigTypesModel
 *
 */

class ConfigTypesModel
{

    static get tableName()
    {
        return 'config_types';
    }

    static get relationMappings()
    {
        return {
            related_config: {
                relation: 'HasManyRelation',
                tableName: 'config',
                from: 'id',
                to: 'type'
            }
        };
    }
}

module.exports.ConfigTypesModel = ConfigTypesModel;
