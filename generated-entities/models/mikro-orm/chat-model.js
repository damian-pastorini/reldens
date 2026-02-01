/**
 *
 * Reldens - ChatModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, player_id, room_id, message, private_player_id, message_type, message_time} = props;
        return new this(id, player_id, room_id, message, private_player_id, message_type, message_time);
    }
    
}

const schema = new EntitySchema({
    class: ChatModel,
    tableName: 'chat',
    properties: {
        id: { type: 'number', primary: true },
        player_id: { type: 'number', persist: false },
        room_id: { type: 'number', persist: false },
        message: { type: 'string' },
        private_player_id: { type: 'number', persist: false },
        message_type: { type: 'number', persist: false },
        message_time: { type: 'Date' },
        related_players_player: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        },
        related_rooms: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'room_id'
        },
        related_players_private_player: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'private_player_id'
        },
        related_chat_message_types: {
            kind: 'm:1',
            entity: 'ChatMessageTypesModel',
            joinColumn: 'message_type'
        }
    },
});
schema._fkMappings = {
    "player_id": {
        "relationKey": "related_players_player",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "room_id": {
        "relationKey": "related_rooms",
        "entityName": "RoomsModel",
        "referencedColumn": "id",
        "nullable": true
    },
    "private_player_id": {
        "relationKey": "related_players_private_player",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": true
    },
    "message_type": {
        "relationKey": "related_chat_message_types",
        "entityName": "ChatMessageTypesModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    ChatModel,
    entity: ChatModel,
    schema: schema
};
