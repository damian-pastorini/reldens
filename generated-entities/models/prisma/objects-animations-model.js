/**
 *
 * Reldens - ObjectsAnimationsModel
 *
 */

class ObjectsAnimationsModel
{

    constructor(id, object_id, animationKey, animationData)
    {
        this.id = id;
        this.object_id = object_id;
        this.animationKey = animationKey;
        this.animationData = animationData;
    }

    static get tableName()
    {
        return 'objects_animations';
    }
    

    static get relationTypes()
    {
        return {
            objects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects'
        };
    }
}

module.exports.ObjectsAnimationsModel = ObjectsAnimationsModel;
