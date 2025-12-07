/**
 *
 * Reldens - UsersLocaleModel
 *
 */

class UsersLocaleModel
{

    constructor(id, locale_id, user_id)
    {
        this.id = id;
        this.locale_id = locale_id;
        this.user_id = user_id;
    }

    static get tableName()
    {
        return 'users_locale';
    }
    

    static get relationTypes()
    {
        return {
            locale: 'one',
            users: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_locale': 'locale',
            'related_users': 'users'
        };
    }
}

module.exports.UsersLocaleModel = UsersLocaleModel;
