/**
 *
 * Reldens - UsersLoginModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class UsersLoginModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'users_login';
    }

    static get relationMappings()
    {
        const { UsersModel } = require('./users-model');
        return {
            parent_user: {
                relation: this.HasOneRelation,
                modelClass: UsersModel,
                join: {
                    from: this.tableName+'.user_id',
                    to: UsersModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.UsersLoginModel = UsersLoginModel;
