/**
 *
 * Reldens - RespawnModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RespawnModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'respawn';
    }

}

module.exports.RespawnModel = RespawnModel;
