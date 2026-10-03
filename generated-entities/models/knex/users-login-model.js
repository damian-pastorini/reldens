/**
 *
 * Reldens - UsersLoginModel
 *
 */

class UsersLoginModel
{

    static get tableName()
    {
        return 'users_login';
    }

    static get relationMappings()
    {
        return {
            related_users: {
                relation: 'BelongsToOneRelation',
                tableName: 'users',
                from: 'user_id',
                to: 'id'
            }
        };
    }
}

module.exports.UsersLoginModel = UsersLoginModel;
