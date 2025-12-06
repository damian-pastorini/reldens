/**
 *
 * Reldens - PlayersStateModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class PlayersStateModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'players_state';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        const { RoomsModel } = require('./rooms-model');
        return {
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            related_rooms: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.room_id',
                    to: RoomsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.PlayersStateModel = PlayersStateModel;
