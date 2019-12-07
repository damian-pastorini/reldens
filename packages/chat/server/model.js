/**
 *
 * Reldens - ChatModel
 *
 * Chat storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');
const { RoomsModel } = require('../../rooms/server/model');

class ChatModel extends Model
{

    static get tableName()
    {
        return 'chat';
    }

    static get relationMappings()
    {
        // @TODO: this is one of the solutions recommended in Objection JS to avoid the require loop.
        //   https://vincit.github.io/objection.js/guide/relations.html#require-loops > see "Solution 1"
        //   I would like to avoid using requires like this so this is a temporal solution.
        const { PlayersModel } = require('../../users/server/players-model');
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

module.exports.ChatModel = ChatModel;
