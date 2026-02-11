/**
 *
 * Reldens - AudioPlayerConfigModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AudioPlayerConfigModel
{

    constructor(id, player_id, category_id, enabled)
    {
        this.id = id;
        this.player_id = player_id;
        this.category_id = category_id;
        this.enabled = enabled;
    }

    static createByProps(props)
    {
        const {id, player_id, category_id, enabled} = props;
        return new this(id, player_id, category_id, enabled);
    }
    
}

const schema = new EntitySchema({
    class: AudioPlayerConfigModel,
    tableName: 'audio_player_config',
    properties: {
        id: { type: 'number', primary: true },
        player_id: { type: 'number', persist: false },
        category_id: { type: 'number', persist: false },
        enabled: { type: 'number', nullable: true },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        },
        related_audio_categories: {
            kind: 'm:1',
            entity: 'AudioCategoriesModel',
            joinColumn: 'category_id'
        }
    },
});
schema._fkMappings = {
    "player_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "category_id": {
        "relationKey": "related_audio_categories",
        "entityName": "AudioCategoriesModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    AudioPlayerConfigModel,
    entity: AudioPlayerConfigModel,
    schema: schema
};
