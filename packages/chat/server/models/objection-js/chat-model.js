/**
 *
 * Reldens - ChatModel
 *
 * Chat storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { RoomsModel } = require('../../../../rooms/server/models/objection-js/rooms-model');

class ChatModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'chat';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('../../../../users/server/models/objection-js/players-model');
        return {
            chat_room: {
                relation: this.HasManyRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'room.id',
                    to: 'rooms.id'
                }
            },
            chat_player_id: {
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'player_id',
                    to: 'players.id'
                }
            },
            chat_private_player_id: {
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'private_player_id',
                    to: 'players.id'
                }
            }
        };
    }

    static saveEntry(entryData)
    {
        return this.query().insert(entryData);
    }

}

module.exports.ChatModel = ChatModel;
