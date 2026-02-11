/**
 *
 * Reldens - UsersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, email, username, password, role_id, status, created_at, updated_at, played_time, login_count} = props;
        return new this(id, email, username, password, role_id, status, created_at, updated_at, played_time, login_count);
    }
    
}

const schema = new EntitySchema({
    class: UsersModel,
    tableName: 'users',
    properties: {
        id: { type: 'number', primary: true },
        email: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        role_id: { type: 'number' },
        status: { type: 'string' },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        played_time: { type: 'number', nullable: true },
        login_count: { type: 'number', nullable: true },
        related_players: {
            kind: '1:m',
            entity: 'PlayersModel',
            mappedBy: 'related_users'
        },
        related_users_locale: {
            kind: '1:m',
            entity: 'UsersLocaleModel',
            mappedBy: 'related_users'
        },
        related_users_login: {
            kind: '1:m',
            entity: 'UsersLoginModel',
            mappedBy: 'related_users'
        }
    },
});

module.exports = {
    UsersModel,
    entity: UsersModel,
    schema: schema
};
