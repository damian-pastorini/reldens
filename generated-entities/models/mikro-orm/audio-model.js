/**
 *
 * Reldens - AudioModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AudioModel
{

    constructor(id, audio_key, files_name, config, room_id, category_id, enabled, created_at, updated_at)
    {
        this.id = id;
        this.audio_key = audio_key;
        this.files_name = files_name;
        this.config = config;
        this.room_id = room_id;
        this.category_id = category_id;
        this.enabled = enabled;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, audio_key, files_name, config, room_id, category_id, enabled, created_at, updated_at} = props;
        return new this(id, audio_key, files_name, config, room_id, category_id, enabled, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: AudioModel,
    tableName: 'audio',
    properties: {
        id: { type: 'number', primary: true },
        audio_key: { type: 'string' },
        files_name: { type: 'string' },
        config: { type: 'string', nullable: true },
        room_id: { type: 'number', persist: false },
        category_id: { type: 'number', persist: false },
        enabled: { type: 'number', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_rooms: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'room_id'
        },
        related_audio_categories: {
            kind: 'm:1',
            entity: 'AudioCategoriesModel',
            joinColumn: 'category_id'
        },
        related_audio_markers: {
            kind: '1:m',
            entity: 'AudioMarkersModel',
            mappedBy: 'related_audio'
        }
    },
});
schema._fkMappings = {
    "room_id": {
        "relationKey": "related_rooms",
        "entityName": "RoomsModel",
        "referencedColumn": "id",
        "nullable": true
    },
    "category_id": {
        "relationKey": "related_audio_categories",
        "entityName": "AudioCategoriesModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    AudioModel,
    entity: AudioModel,
    schema: schema
};
