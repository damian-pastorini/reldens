/**
 *
 * Reldens - ConfigModel
 *
 * Configurations storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class ConfigModel extends Model
{

    static get tableName()
    {
        return 'config';
    }

}

module.exports.ConfigModel = ConfigModel;
