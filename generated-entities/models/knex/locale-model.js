/**
 *
 * Reldens - LocaleModel
 *
 */

class LocaleModel
{

    static get tableName()
    {
        return 'locale';
    }

    static get relationMappings()
    {
        return {
            related_snippets: {
                relation: 'HasManyRelation',
                tableName: 'snippets',
                from: 'id',
                to: 'locale_id'
            },
            related_users_locale: {
                relation: 'HasManyRelation',
                tableName: 'users_locale',
                from: 'id',
                to: 'locale_id'
            }
        };
    }
}

module.exports.LocaleModel = LocaleModel;
