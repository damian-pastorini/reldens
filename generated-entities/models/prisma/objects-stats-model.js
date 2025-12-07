/**
 *
 * Reldens - ObjectsStatsModel
 *
 */

class ObjectsStatsModel
{

    constructor(id, object_id, stat_id, base_value, value)
    {
        this.id = id;
        this.object_id = object_id;
        this.stat_id = stat_id;
        this.base_value = base_value;
        this.value = value;
    }

    static get tableName()
    {
        return 'objects_stats';
    }
    

    static get relationTypes()
    {
        return {
            objects: 'one',
            stats: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects',
            'related_stats': 'stats'
        };
    }
}

module.exports.ObjectsStatsModel = ObjectsStatsModel;
