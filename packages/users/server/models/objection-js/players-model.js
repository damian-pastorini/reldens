/**
 *
 * Reldens - PlayersModel
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
                    from: this.tableName+'.user_id',
                    to: UsersModel.tableName+'.id'
                }
            },
            state: {
                relation: this.HasOneRelation,
                modelClass: PlayersStateModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersStateModel.tableName+'.player_id'
                }
            }
        }
    }

}

module.exports.PlayersModel = PlayersModel;
