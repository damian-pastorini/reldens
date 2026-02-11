/**
 *
 * Reldens - RoomsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, name, title, map_filename, scene_images, room_class_key, server_url, customData, created_at, updated_at} = props;
        return new this(id, name, title, map_filename, scene_images, room_class_key, server_url, customData, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: RoomsModel,
    tableName: 'rooms',
    properties: {
        id: { type: 'number', primary: true },
        name: { type: 'string' },
        title: { type: 'string' },
        map_filename: { type: 'string' },
        scene_images: { type: 'string' },
        room_class_key: { type: 'string', nullable: true },
        server_url: { type: 'string', nullable: true },
        customData: { type: 'string', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_audio: {
            kind: '1:m',
            entity: 'AudioModel',
            mappedBy: 'related_rooms'
        },
        related_chat: {
            kind: '1:m',
            entity: 'ChatModel',
            mappedBy: 'related_rooms'
        },
        related_objects: {
            kind: '1:m',
            entity: 'ObjectsModel',
            mappedBy: 'related_rooms'
        },
        related_players_state: {
            kind: '1:m',
            entity: 'PlayersStateModel',
            mappedBy: 'related_rooms'
        },
        related_rooms_change_points_room: {
            kind: '1:m',
            entity: 'RoomsChangePointsModel',
            mappedBy: 'related_rooms_room'
        },
        related_rooms_change_points_next_room: {
            kind: '1:m',
            entity: 'RoomsChangePointsModel',
            mappedBy: 'related_rooms_room'
        },
        related_rooms_return_points_room: {
            kind: '1:m',
            entity: 'RoomsReturnPointsModel',
            mappedBy: 'related_rooms_room'
        },
        related_rooms_return_points_from_room: {
            kind: '1:m',
            entity: 'RoomsReturnPointsModel',
            mappedBy: 'related_rooms_room'
        }
    },
});

module.exports = {
    RoomsModel,
    entity: RoomsModel,
    schema: schema
};
