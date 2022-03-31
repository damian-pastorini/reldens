/**
 *
 * Reldens - ChatModel
 *
 * Chat storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ChatModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'chat';
    }

    static get relationMappings()
    {
        const { RoomsModel } = require('../../../../rooms/server/models/objection-js/rooms-model');
        const { PlayersModel } = require('../../../../users/server/models/objection-js/players-model');
        return {
            chat_room: {
                relation: this.HasManyRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.room_id',
                    to: RoomsModel.tableName+'.id'
                }
            },
            chat_player_id: {
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            chat_private_player_id: {
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.private_player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.ChatModel = ChatModel;
