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

}

module.exports.ConfigTypesModel = ConfigTypesModel;
