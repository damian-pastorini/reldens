/**
 *
 * Reldens - LocaleModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class LocaleModel
{

    constructor(id, locale, language_code, country_code, enabled)
    {
        this.id = id;
        this.locale = locale;
        this.language_code = language_code;
        this.country_code = country_code;
        this.enabled = enabled;
    }

    static createByProps(props)
    {
        const {id, locale, language_code, country_code, enabled} = props;
        return new this(id, locale, language_code, country_code, enabled);
    }
    
}

const schema = new EntitySchema({
    class: LocaleModel,
    tableName: 'locale',
    properties: {
        id: { type: 'number', primary: true },
        locale: { type: 'string' },
        language_code: { type: 'string' },
        country_code: { type: 'string', nullable: true },
        enabled: { type: 'number', nullable: true },
        related_snippets: {
            kind: '1:m',
            entity: 'SnippetsModel',
            mappedBy: 'related_locale'
        },
        related_users_locale: {
            kind: '1:m',
            entity: 'UsersLocaleModel',
            mappedBy: 'related_locale'
        }
    },
});

module.exports = {
    LocaleModel,
    entity: LocaleModel,
    schema: schema
};
