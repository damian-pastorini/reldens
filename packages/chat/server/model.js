/**
 *
 * Reldens - ChatModel
 *
 * Chat storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');
const { RoomsModel } = require('../../rooms/server/model');

class ChatModel extends ModelClass
{

    static get tableName()
    {
        return 'chat';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('../../users/server/players-model');
        return {
            chat_room: {
                relation: ModelClass.HasManyRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'room.id',
                    to: 'rooms.id'
                }
            },
            chat_player_id: {
                relation: ModelClass.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'player_id',
                    to: 'players.id'
                }
            },
            chat_private_player_id: {
                relation: ModelClass.HasManyRelation,
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
