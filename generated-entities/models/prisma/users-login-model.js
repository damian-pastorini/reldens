/**
 *
 * Reldens - UsersLoginModel
 *
 */

class UsersLoginModel
{

    constructor(id, user_id, login_date, logout_date)
    {
        this.id = id;
        this.user_id = user_id;
        this.login_date = login_date;
        this.logout_date = logout_date;
    }

    static get tableName()
    {
        return 'users_login';
    }
    

    static get relationTypes()
    {
        return {
            users: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_users': 'users'
        };
    }
}

module.exports.UsersLoginModel = UsersLoginModel;
