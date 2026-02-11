/**
 *
 * Reldens - AudioCategoriesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AudioCategoriesModel
{

    constructor(id, category_key, category_label, enabled, single_audio, created_at, updated_at)
    {
        this.id = id;
        this.category_key = category_key;
        this.category_label = category_label;
        this.enabled = enabled;
        this.single_audio = single_audio;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, category_key, category_label, enabled, single_audio, created_at, updated_at} = props;
        return new this(id, category_key, category_label, enabled, single_audio, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: AudioCategoriesModel,
    tableName: 'audio_categories',
    properties: {
        id: { type: 'number', primary: true },
        category_key: { type: 'string' },
        category_label: { type: 'string' },
        enabled: { type: 'number', nullable: true },
        single_audio: { type: 'number', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_audio: {
            kind: '1:m',
            entity: 'AudioModel',
            mappedBy: 'related_audio_categories'
        },
        related_audio_player_config: {
            kind: '1:m',
            entity: 'AudioPlayerConfigModel',
            mappedBy: 'related_audio_categories'
        }
    },
});

module.exports = {
    AudioCategoriesModel,
    entity: AudioCategoriesModel,
    schema: schema
};
