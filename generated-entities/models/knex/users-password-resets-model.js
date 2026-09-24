/**
 *
 * Reldens - UsersPasswordResetsModel
 *
 */

class UsersPasswordResetsModel
{

    static get tableName()
    {
        return 'users_password_resets';
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

module.exports.UsersPasswordResetsModel = UsersPasswordResetsModel;
