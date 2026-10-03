/**
 *
 * Reldens - UsersLocaleModel
 *
 */

class UsersLocaleModel
{

    static get tableName()
    {
        return 'users_locale';
    }

    static get relationMappings()
    {
        return {
            related_locale: {
                relation: 'BelongsToOneRelation',
                tableName: 'locale',
                from: 'locale_id',
                to: 'id'
            },
            related_users: {
                relation: 'BelongsToOneRelation',
                tableName: 'users',
                from: 'user_id',
                to: 'id'
            }
        };
    }
}

module.exports.UsersLocaleModel = UsersLocaleModel;
