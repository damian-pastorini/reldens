/**
 *
 * Reldens - SnippetsModel
 *
 */

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

    static get tableName()
    {
        return 'snippets';
    }
    

    static get relationTypes()
    {
        return {
            locale: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_locale': 'locale'
        };
    }
}

module.exports.SnippetsModel = SnippetsModel;
