/**
 *
 * Reldens - ConfigModel
 *
 */

class ConfigModel
{

    static get tableName()
    {
        return 'config';
    }

    static get relationMappings()
    {
        return {
            related_config_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'config_types',
                from: 'type',
                to: 'id'
            }
        };
    }
}

module.exports.ConfigModel = ConfigModel;
