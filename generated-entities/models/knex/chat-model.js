/**
 *
 * Reldens - ChatModel
 *
 */

class ChatModel
{

    static get tableName()
    {
        return 'chat';
    }

    static get relationMappings()
    {
        return {
            related_players_player: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'player_id',
                to: 'id'
            },
            related_rooms: {
                relation: 'BelongsToOneRelation',
                tableName: 'rooms',
                from: 'room_id',
                to: 'id'
            },
            related_players_private_player: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'private_player_id',
                to: 'id'
            },
            related_chat_message_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'chat_message_types',
                from: 'message_type',
                to: 'id'
            }
        };
    }
}

module.exports.ChatModel = ChatModel;
