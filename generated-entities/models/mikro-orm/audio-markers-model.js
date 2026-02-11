/**
 *
 * Reldens - AudioMarkersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AudioMarkersModel
{

    constructor(id, audio_id, marker_key, start, duration, config)
    {
        this.id = id;
        this.audio_id = audio_id;
        this.marker_key = marker_key;
        this.start = start;
        this.duration = duration;
        this.config = config;
    }

    static createByProps(props)
    {
        const {id, audio_id, marker_key, start, duration, config} = props;
        return new this(id, audio_id, marker_key, start, duration, config);
    }
    
}

const schema = new EntitySchema({
    class: AudioMarkersModel,
    tableName: 'audio_markers',
    properties: {
        id: { type: 'number', primary: true },
        audio_id: { type: 'number', persist: false },
        marker_key: { type: 'string' },
        start: { type: 'number' },
        duration: { type: 'number' },
        config: { type: 'string', nullable: true },
        related_audio: {
            kind: 'm:1',
            entity: 'AudioModel',
            joinColumn: 'audio_id'
        }
    },
});
schema._fkMappings = {
    "audio_id": {
        "relationKey": "related_audio",
        "entityName": "AudioModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    AudioMarkersModel,
    entity: AudioMarkersModel,
    schema: schema
};
