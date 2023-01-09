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
        const { StatsModel } = require('../../../../users/server/models/objection-js/stats-model');
        const { ObjectsModel } = require('./objects-model');
        return {
            parent_object: {
                relation: this.HasOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            },
            parent_stat: {
                relation: this.HasOneRelation,
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
