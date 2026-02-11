/**
 *
 * Reldens - UsersLocaleModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class UsersLocaleModel
{

    constructor(id, locale_id, user_id)
    {
        this.id = id;
        this.locale_id = locale_id;
        this.user_id = user_id;
    }

    static createByProps(props)
    {
        const {id, locale_id, user_id} = props;
        return new this(id, locale_id, user_id);
    }
    
}

const schema = new EntitySchema({
    class: UsersLocaleModel,
    tableName: 'users_locale',
    properties: {
        id: { type: 'number', primary: true },
        locale_id: { type: 'number', persist: false },
        user_id: { type: 'number', persist: false },
        related_locale: {
            kind: 'm:1',
            entity: 'LocaleModel',
            joinColumn: 'locale_id'
        },
        related_users: {
            kind: 'm:1',
            entity: 'UsersModel',
            joinColumn: 'user_id'
        }
    },
});
schema._fkMappings = {
    "locale_id": {
        "relationKey": "related_locale",
        "entityName": "LocaleModel",
        "referencedColumn": "id",
        "nullable": true
    },
    "user_id": {
        "relationKey": "related_users",
        "entityName": "UsersModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    UsersLocaleModel,
    entity: UsersLocaleModel,
    schema: schema
};
