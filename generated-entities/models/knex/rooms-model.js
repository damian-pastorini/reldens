/**
 *
 * Reldens - RoomsModel
 *
 */

class RoomsModel
{

    static get tableName()
    {
        return 'rooms';
    }

    static get relationMappings()
    {
        return {
            related_audio: {
                relation: 'HasManyRelation',
                tableName: 'audio',
                from: 'id',
                to: 'room_id'
            },
            related_chat: {
                relation: 'HasManyRelation',
                tableName: 'chat',
                from: 'id',
                to: 'room_id'
            },
            related_objects: {
                relation: 'HasManyRelation',
                tableName: 'objects',
                from: 'id',
                to: 'room_id'
            },
            related_players_state: {
                relation: 'HasManyRelation',
                tableName: 'players_state',
                from: 'id',
                to: 'room_id'
            },
            related_rooms_change_points_room: {
                relation: 'HasManyRelation',
                tableName: 'rooms_change_points',
                from: 'id',
                to: 'room_id'
            },
            related_rooms_change_points_next_room: {
                relation: 'HasManyRelation',
                tableName: 'rooms_change_points',
                from: 'id',
                to: 'next_room_id'
            },
            related_rooms_return_points_room: {
                relation: 'HasManyRelation',
                tableName: 'rooms_return_points',
                from: 'id',
                to: 'room_id'
            },
            related_rooms_return_points_from_room: {
                relation: 'HasManyRelation',
                tableName: 'rooms_return_points',
                from: 'id',
                to: 'from_room_id'
            }
        };
    }
}

module.exports.RoomsModel = RoomsModel;
