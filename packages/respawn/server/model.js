/**
 *
 * Reldens - RespawnModel
 *
 * Respawn model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class RespawnModel extends Model
{

    static get tableName()
    {
        return 'respawn';
    }

}

module.exports.RespawnModel = RespawnModel;
