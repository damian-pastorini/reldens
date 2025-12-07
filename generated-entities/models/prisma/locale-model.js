/**
 *
 * Reldens - LocaleModel
 *
 */

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

    static get tableName()
    {
        return 'locale';
    }
    

    static get relationTypes()
    {
        return {
            snippets: 'many',
            users_locale: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_snippets': 'snippets',
            'related_users_locale': 'users_locale'
        };
    }
}

module.exports.LocaleModel = LocaleModel;
