/**
 *
 * Reldens - PlayerStatsModel
 *
 * Players stats storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class PlayersStatsModel extends ModelClass
{

    static get tableName()
    {
        return 'players_stats';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        return {
            parent_player: {
                relation: ModelClass.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'players_stats.player_id',
                    to: 'players.id'
                }
            }
        }
    }

    static updateBy(field, fieldValue, updatePatch)
    {
        return this.query()
            .patch(updatePatch)
            .where(field, fieldValue);
    }

}

module.exports.PlayersStatsModel = PlayersStatsModel;
