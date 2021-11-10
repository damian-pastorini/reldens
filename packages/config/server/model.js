/**
 *
 * Reldens - ConfigModel
 *
 * Configurations storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');

class ConfigModel extends ModelClassDeprecated
{

    static get tableName()
    {
        return 'config';
    }

}

module.exports.ConfigModel = ConfigModel;
