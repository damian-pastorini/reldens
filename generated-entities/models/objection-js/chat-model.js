/**
 *
 * Reldens - ChatModel
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
        const { PlayersModel } = require('./players-model');
        const { RoomsModel } = require('./rooms-model');
        const { ChatMessageTypesModel } = require('./chat-message-types-model');
        return {
            related_players_player: {
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
            },
            related_players_private_player: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.private_player_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            related_chat_message_types: {
                relation: this.BelongsToOneRelation,
                modelClass: ChatMessageTypesModel,
                join: {
                    from: this.tableName+'.message_type',
                    to: ChatMessageTypesModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ChatModel = ChatModel;
