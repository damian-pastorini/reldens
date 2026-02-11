/**
 *
 * Reldens - AdsEventVideoModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AdsEventVideoModel
{

    constructor(id, ads_id, event_key, event_data)
    {
        this.id = id;
        this.ads_id = ads_id;
        this.event_key = event_key;
        this.event_data = event_data;
    }

    static createByProps(props)
    {
        const {id, ads_id, event_key, event_data} = props;
        return new this(id, ads_id, event_key, event_data);
    }
    
}

const schema = new EntitySchema({
    class: AdsEventVideoModel,
    tableName: 'ads_event_video',
    properties: {
        id: { type: 'number', primary: true },
        ads_id: { type: 'number', persist: false },
        event_key: { type: 'string' },
        event_data: { type: 'string' },
        related_ads: {
            kind: 'm:1',
            entity: 'AdsModel',
            joinColumn: 'ads_id'
        }
    },
});
schema._fkMappings = {
    "ads_id": {
        "relationKey": "related_ads",
        "entityName": "AdsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    AdsEventVideoModel,
    entity: AdsEventVideoModel,
    schema: schema
};
