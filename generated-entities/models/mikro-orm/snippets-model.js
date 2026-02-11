/**
 *
 * Reldens - SnippetsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SnippetsModel
{

    constructor(id, locale_id, key, value, created_at, updated_at)
    {
        this.id = id;
        this.locale_id = locale_id;
        this.key = key;
        this.value = value;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, locale_id, key, value, created_at, updated_at} = props;
        return new this(id, locale_id, key, value, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: SnippetsModel,
    tableName: 'snippets',
    properties: {
        id: { type: 'number', primary: true },
        locale_id: { type: 'number', persist: false },
        key: { type: 'string' },
        value: { type: 'string' },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_locale: {
            kind: 'm:1',
            entity: 'LocaleModel',
            joinColumn: 'locale_id'
        }
    },
});
schema._fkMappings = {
    "locale_id": {
        "relationKey": "related_locale",
        "entityName": "LocaleModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SnippetsModel,
    entity: SnippetsModel,
    schema: schema
};
