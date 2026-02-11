/**
 *
 * Reldens - AdsProvidersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AdsProvidersModel
{

    constructor(id, key, enabled)
    {
        this.id = id;
        this.key = key;
        this.enabled = enabled;
    }

    static createByProps(props)
    {
        const {id, key, enabled} = props;
        return new this(id, key, enabled);
    }
    
}

const schema = new EntitySchema({
    class: AdsProvidersModel,
    tableName: 'ads_providers',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        enabled: { type: 'number', nullable: true },
        related_ads: {
            kind: '1:m',
            entity: 'AdsModel',
            mappedBy: 'related_ads_providers'
        }
    },
});

module.exports = {
    AdsProvidersModel,
    entity: AdsProvidersModel,
    schema: schema
};
