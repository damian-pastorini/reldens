/**
 *
 * Reldens - UsersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class UsersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'users';
    }
    
    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        const { UsersLocaleModel } = require('./users-locale-model');
        const { UsersLoginModel } = require('./users-login-model');
        return {
            related_players: {
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersModel.tableName+'.user_id'
                }
            },
            related_users_locale: {
                relation: this.HasManyRelation,
                modelClass: UsersLocaleModel,
                join: {
                    from: this.tableName+'.id',
                    to: UsersLocaleModel.tableName+'.user_id'
                }
            },
            related_users_login: {
                relation: this.HasManyRelation,
                modelClass: UsersLoginModel,
                join: {
                    from: this.tableName+'.id',
                    to: UsersLoginModel.tableName+'.user_id'
                }
            },
            players: {
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersModel.tableName+'.user_id'
                }
            },
            login: {
                relation: this.HasManyRelation,
                modelClass: UsersLoginModel,
                join: {
                    from: this.tableName+'.id',
                    to: UsersLoginModel.tableName+'.user_id'
                }
            }
        };
    }
}

module.exports.UsersModel = UsersModel;
