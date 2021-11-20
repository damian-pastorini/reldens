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

}

module.exports.ConfigModel = ConfigModel;
