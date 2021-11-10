/**
 *
 * Reldens - PlayersModel
 *
 * Players storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');

class PlayersModel extends ModelClassDeprecated
{

    static get tableName()
    {
        return 'players';
    }

    static get relationMappings()
    {
        const { UsersModel } = require('./model');
        const { PlayersStateModel } = require('./players-state-model');
        return {
            parent_user: {
                relation: ModelClassDeprecated.BelongsToOneRelation,
                modelClass: UsersModel,
                join: {
                    from: 'players.user_id',
                    to: 'users.id'
                }
            },
            state: {
                relation: ModelClassDeprecated.HasOneRelation,
                modelClass: PlayersStateModel,
                join: {
                    from: 'players.id',
                    to: PlayersStateModel.tableName+'.player_id'
                }
            }
        }
    }

    static savePlayer(playerData)
    {
        return this.query()
            .insertGraphAndFetch(playerData);
    }

}

module.exports.PlayersModel = PlayersModel;
