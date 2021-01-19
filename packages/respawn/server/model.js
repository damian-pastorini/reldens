/**
 *
 * Reldens - RespawnModel
 *
 * Respawn model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class RespawnModel extends ModelClass
{

    static get tableName()
    {
        return 'respawn';
    }

    static loadByLayerName(layerName)
    {
        return this.query().where('layer', layerName);
    }

}

module.exports.RespawnModel = RespawnModel;
