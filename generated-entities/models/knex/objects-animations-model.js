/**
 *
 * Reldens - ObjectsAnimationsModel
 *
 */

class ObjectsAnimationsModel
{

    static get tableName()
    {
        return 'objects_animations';
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

module.exports.ObjectsAnimationsModel = ObjectsAnimationsModel;
