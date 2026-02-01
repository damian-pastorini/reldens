/**
 *
 * Reldens - AdsBannerModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AdsBannerModel
{

    constructor(id, ads_id, banner_data)
    {
        this.id = id;
        this.ads_id = ads_id;
        this.banner_data = banner_data;
    }

    static createByProps(props)
    {
        const {id, ads_id, banner_data} = props;
        return new this(id, ads_id, banner_data);
    }
    
}

const schema = new EntitySchema({
    class: AdsBannerModel,
    tableName: 'ads_banner',
    properties: {
        id: { type: 'number', primary: true },
        ads_id: { type: 'number', persist: false },
        banner_data: { type: 'string' },
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
    AdsBannerModel,
    entity: AdsBannerModel,
    schema: schema
};
