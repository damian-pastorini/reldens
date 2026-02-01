/**
 *
 * Reldens - AdsTypesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AdsTypesModel
{

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
    }

    static createByProps(props)
    {
        const {id, key} = props;
        return new this(id, key);
    }
    
}

const schema = new EntitySchema({
    class: AdsTypesModel,
    tableName: 'ads_types',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        related_ads: {
            kind: '1:m',
            entity: 'AdsModel',
            mappedBy: 'related_ads_types'
        }
    },
});

module.exports = {
    AdsTypesModel,
    entity: AdsTypesModel,
    schema: schema
};
