/**
 *
 * Reldens - UsersModel
 *
 */

class UsersModel
{

    static get tableName()
    {
        return 'users';
    }

    static get relationMappings()
    {
        return {
            related_players: {
                relation: 'HasManyRelation',
                tableName: 'players',
                from: 'id',
                to: 'user_id'
            },
            related_users_locale: {
                relation: 'HasManyRelation',
                tableName: 'users_locale',
                from: 'id',
                to: 'user_id'
            },
            related_users_login: {
                relation: 'HasManyRelation',
                tableName: 'users_login',
                from: 'id',
                to: 'user_id'
            }
        };
    }
}

module.exports.UsersModel = UsersModel;
