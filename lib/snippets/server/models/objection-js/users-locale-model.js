/**
 *
 * Reldens - UserLocaleModel
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
        const { UsersModel } = require('../../../../users/server/models/objection-js/users-model');
        return {
            locale: {
                relation: this.HasOneRelation,
                modelClass: LocaleModel,
                join: {
                    from: this.tableName+'.locale_id',
                    to: LocaleModel.tableName+'.id'
                }
            },
            user: {
                relation: this.HasOneRelation,
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
