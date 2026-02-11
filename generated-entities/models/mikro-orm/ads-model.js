/**
 *
 * Reldens - AdsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AdsModel
{

    constructor(id, key, provider_id, type_id, width, height, position, top, bottom, left, right, replay, enabled, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.provider_id = provider_id;
        this.type_id = type_id;
        this.width = width;
        this.height = height;
        this.position = position;
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
        this.replay = replay;
        this.enabled = enabled;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, key, provider_id, type_id, width, height, position, top, bottom, left, right, replay, enabled, created_at, updated_at} = props;
        return new this(id, key, provider_id, type_id, width, height, position, top, bottom, left, right, replay, enabled, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: AdsModel,
    tableName: 'ads',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        provider_id: { type: 'number', persist: false },
        type_id: { type: 'number', persist: false },
        width: { type: 'number', nullable: true },
        height: { type: 'number', nullable: true },
        position: { type: 'string', nullable: true },
        top: { type: 'number', nullable: true },
        bottom: { type: 'number', nullable: true },
        left: { type: 'number', nullable: true },
        right: { type: 'number', nullable: true },
        replay: { type: 'number', nullable: true },
        enabled: { type: 'number', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_ads_providers: {
            kind: 'm:1',
            entity: 'AdsProvidersModel',
            joinColumn: 'provider_id'
        },
        related_ads_types: {
            kind: 'm:1',
            entity: 'AdsTypesModel',
            joinColumn: 'type_id'
        },
        related_ads_banner: {
            kind: '1:1',
            entity: 'AdsBannerModel',
            mappedBy: 'related_ads'
        },
        related_ads_event_video: {
            kind: '1:1',
            entity: 'AdsEventVideoModel',
            mappedBy: 'related_ads'
        },
        related_ads_played: {
            kind: '1:m',
            entity: 'AdsPlayedModel',
            mappedBy: 'related_ads'
        }
    },
});
schema._fkMappings = {
    "provider_id": {
        "relationKey": "related_ads_providers",
        "entityName": "AdsProvidersModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "type_id": {
        "relationKey": "related_ads_types",
        "entityName": "AdsTypesModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    AdsModel,
    entity: AdsModel,
    schema: schema
};
