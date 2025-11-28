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

    static get relationMappings()
    {
        const { ObjectsModel } = require('./objects-model');
        return {
            related_objects: {
                relation: this.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.RespawnModel = RespawnModel;
