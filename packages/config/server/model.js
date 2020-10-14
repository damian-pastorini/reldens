/**
 *
 * Reldens - ConfigModel
 *
 * Configurations storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class ConfigModel extends ModelClass
{

    static get tableName()
    {
        return 'config';
    }

}

module.exports.ConfigModel = ConfigModel;
