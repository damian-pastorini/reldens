/**
 *
 * Reldens - ChatModel
 *
 */

class ChatModel
{

    constructor(id, player_id, room_id, message, private_player_id, message_type, message_time)
    {
        this.id = id;
        this.player_id = player_id;
        this.room_id = room_id;
        this.message = message;
        this.private_player_id = private_player_id;
        this.message_type = message_type;
        this.message_time = message_time;
    }

    static get tableName()
    {
        return 'chat';
    }
    

    static get relationTypes()
    {
        return {
            players_chat_player_idToplayers: 'one',
            players_chat_private_player_idToplayers: 'one',
            rooms: 'one',
            chat_message_types: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players_player': 'players_chat_player_idToplayers',
            'related_rooms': 'rooms',
            'related_players_private_player': 'players_chat_private_player_idToplayers',
            'related_chat_message_types': 'chat_message_types'
        };
    }
}

module.exports.ChatModel = ChatModel;
