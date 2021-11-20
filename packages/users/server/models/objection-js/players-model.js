/**
 *
 * Reldens - PlayersModel
 *
 * Players storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class PlayersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'players';
    }

    static get relationMappings()
    {
        const { UsersModel } = require('./users-model');
        const { PlayersStateModel } = require('./players-state-model');
        return {
            parent_user: {
                relation: this.BelongsToOneRelation,
                modelClass: UsersModel,
                join: {
                    from: 'players.user_id',
                    to: 'users.id'
                }
            },
            state: {
                relation: this.HasOneRelation,
                modelClass: PlayersStateModel,
                join: {
                    from: 'players.id',
                    to: PlayersStateModel.tableName+'.player_id'
                }
            }
        }
    }

}

module.exports.PlayersModel = PlayersModel;
