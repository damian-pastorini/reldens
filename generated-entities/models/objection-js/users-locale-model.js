/**
 *
 * Reldens - UsersLocaleModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class UsersLocaleModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'users_locale';
    }

    static get relationMappings()
    {
        const { LocaleModel } = require('./locale-model');
        const { UsersModel } = require('./users-model');
        return {
            related_locale: {
                relation: this.BelongsToOneRelation,
                modelClass: LocaleModel,
                join: {
                    from: this.tableName+'.locale_id',
                    to: LocaleModel.tableName+'.id'
                }
            },
            related_users: {
                relation: this.BelongsToOneRelation,
                modelClass: UsersModel,
                join: {
                    from: this.tableName+'.user_id',
                    to: UsersModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.UsersLocaleModel = UsersLocaleModel;
