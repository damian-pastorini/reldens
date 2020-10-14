/**
 *
 * Reldens - PlayersModel
 *
 * Players storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class PlayersModel extends ModelClass
{

    static get tableName()
    {
        return 'players';
    }

    static get relationMappings()
    {
        const { UsersModel } = require('./model');
        const { PlayersStatsModel } = require('./players-stats-model');
        const { PlayersStateModel } = require('./players-state-model');
        return {
            parent_user: {
                relation: ModelClass.BelongsToOneRelation,
                modelClass: UsersModel,
                join: {
                    from: 'players.user_id',
                    to: 'users.id'
                }
            },
            stats: {
                relation: ModelClass.HasOneRelation,
                modelClass: PlayersStatsModel,
                join: {
                    from: 'players.id',
                    to: 'players_stats.player_id'
                }
            },
            state: {
                relation: ModelClass.HasOneRelation,
                modelClass: PlayersStateModel,
                join: {
                    from: 'players.id',
                    to: 'players_state.player_id'
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

module.exports.PlayersModel = PlayersModel;
