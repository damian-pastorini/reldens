/**
 *
 * Reldens - UsersModel
 *
 */

class UsersModel
{

    constructor(id, email, username, password, role_id, status, created_at, updated_at, played_time, login_count)
    {
        this.id = id;
        this.email = email;
        this.username = username;
        this.password = password;
        this.role_id = role_id;
        this.status = status;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.played_time = played_time;
        this.login_count = login_count;
    }

    static get tableName()
    {
        return 'users';
    }
    

    static get relationTypes()
    {
        return {
            players: 'many',
            users_locale: 'many',
            users_login: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players': 'players',
            'related_users_locale': 'users_locale',
            'related_users_login': 'users_login'
        };
    }
}

module.exports.UsersModel = UsersModel;
