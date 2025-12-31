/**
 *
 * Reldens - ObjectsStatsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsStatsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_stats';
    }

    static get relationMappings()
    {
        const { ObjectsModel } = require('./objects-model');
        const { StatsModel } = require('./stats-model');
        return {
            related_objects: {
                relation: this.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            },
            related_stats: {
                relation: this.BelongsToOneRelation,
                modelClass: StatsModel,
                join: {
                    from: this.tableName+'.stat_id',
                    to: StatsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ObjectsStatsModel = ObjectsStatsModel;
