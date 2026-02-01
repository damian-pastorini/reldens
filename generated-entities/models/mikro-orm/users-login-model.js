/**
 *
 * Reldens - UsersLoginModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class UsersLoginModel
{

    constructor(id, user_id, login_date, logout_date)
    {
        this.id = id;
        this.user_id = user_id;
        this.login_date = login_date;
        this.logout_date = logout_date;
    }

    static createByProps(props)
    {
        const {id, user_id, login_date, logout_date} = props;
        return new this(id, user_id, login_date, logout_date);
    }
    
}

const schema = new EntitySchema({
    class: UsersLoginModel,
    tableName: 'users_login',
    properties: {
        id: { type: 'number', primary: true },
        user_id: { type: 'number', persist: false },
        login_date: { type: 'Date', nullable: true },
        logout_date: { type: 'Date', nullable: true },
        related_users: {
            kind: 'm:1',
            entity: 'UsersModel',
            joinColumn: 'user_id'
        }
    },
});
schema._fkMappings = {
    "user_id": {
        "relationKey": "related_users",
        "entityName": "UsersModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    UsersLoginModel,
    entity: UsersLoginModel,
    schema: schema
};
