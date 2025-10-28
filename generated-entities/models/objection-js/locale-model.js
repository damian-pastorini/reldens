/**
 *
 * Reldens - LocaleModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class LocaleModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'locale';
    }
    

    static get relationMappings()
    {
        const { SnippetsModel } = require('./snippets-model');
        const { UsersLocaleModel } = require('./users-locale-model');
        return {
            related_snippets: {
                relation: this.HasManyRelation,
                modelClass: SnippetsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SnippetsModel.tableName+'.locale_id'
                }
            },
            related_users_locale: {
                relation: this.HasManyRelation,
                modelClass: UsersLocaleModel,
                join: {
                    from: this.tableName+'.id',
                    to: UsersLocaleModel.tableName+'.locale_id'
                }
            }
        };
    }
}

module.exports.LocaleModel = LocaleModel;
