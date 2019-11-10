/**
 *
 * Reldens - ChatModel
 *
 * Chat storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class ChatModel extends Model
{

    static get tableName()
    {
        return 'chat';
    }

    static get relationMappings()
    {
        const RoomsModel = require('../../rooms/server/model');
        const PlayersModel = require('../../users/server/players-model');
        return {
            chat_room: {
                relation: Model.HasManyRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'room.id',
                    to: 'rooms.id'
                }
            },
            chat_player_id: {
                relation: Model.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'player_id',
                    to: 'players.id'
                }
            },
            chat_private_player_id: {
                relation: Model.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'private_player_id',
                    to: 'players.id'
                }
            }
        };
    }

}

module.exports = ChatModel;
