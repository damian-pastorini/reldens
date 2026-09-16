/**
 *
 * Reldens - RespawnModel
 *
 */

class RespawnModel
{

    static get tableName()
    {
        return 'respawn';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects',
                from: 'object_id',
                to: 'id'
            }
        };
    }
}

module.exports.RespawnModel = RespawnModel;
