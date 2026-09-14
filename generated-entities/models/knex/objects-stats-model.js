/**
 *
 * Reldens - ObjectsStatsModel
 *
 */

class ObjectsStatsModel
{

    static get tableName()
    {
        return 'objects_stats';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects',
                from: 'object_id',
                to: 'id'
            },
            related_stats: {
                relation: 'BelongsToOneRelation',
                tableName: 'stats',
                from: 'stat_id',
                to: 'id'
            }
        };
    }
}

module.exports.ObjectsStatsModel = ObjectsStatsModel;
