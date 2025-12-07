/**
 *
 * Reldens - RoomsModel
 *
 */

class RoomsModel
{

    constructor(id, name, title, map_filename, scene_images, room_class_key, server_url, customData, created_at, updated_at)
    {
        this.id = id;
        this.name = name;
        this.title = title;
        this.map_filename = map_filename;
        this.scene_images = scene_images;
        this.room_class_key = room_class_key;
        this.server_url = server_url;
        this.customData = customData;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'rooms';
    }
    

    static get relationTypes()
    {
        return {
            audio: 'many',
            chat: 'many',
            objects: 'many',
            players_state: 'many',
            rooms_change_points_rooms_change_points_room_idTorooms: 'many',
            rooms_change_points_rooms_change_points_next_room_idTorooms: 'many',
            rooms_return_points_rooms_return_points_from_room_idTorooms: 'many',
            rooms_return_points_rooms_return_points_room_idTorooms: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_audio': 'audio',
            'related_chat': 'chat',
            'related_objects': 'objects',
            'related_players_state': 'players_state',
            'related_rooms_change_points_room': 'rooms_change_points_rooms_change_points_room_idTorooms',
            'related_rooms_change_points_next_room': 'rooms_change_points_rooms_change_points_next_room_idTorooms',
            'related_rooms_return_points_from_room': 'rooms_return_points_rooms_return_points_from_room_idTorooms',
            'related_rooms_return_points_room': 'rooms_return_points_rooms_return_points_room_idTorooms'
        };
    }
}

module.exports.RoomsModel = RoomsModel;
