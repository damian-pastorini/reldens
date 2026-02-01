/**
 *
 * Reldens - ClanMembersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ClanMembersModel
{

    constructor(id, clan_id, player_id)
    {
        this.id = id;
        this.clan_id = clan_id;
        this.player_id = player_id;
    }

    static createByProps(props)
    {
        const {id, clan_id, player_id} = props;
        return new this(id, clan_id, player_id);
    }
    
}

const schema = new EntitySchema({
    class: ClanMembersModel,
    tableName: 'clan_members',
    properties: {
        id: { type: 'number', primary: true },
        clan_id: { type: 'number', persist: false },
        player_id: { type: 'number', persist: false },
        related_clan: {
            kind: 'm:1',
            entity: 'ClanModel',
            joinColumn: 'clan_id'
        },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        }
    },
});
schema._fkMappings = {
    "clan_id": {
        "relationKey": "related_clan",
        "entityName": "ClanModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "player_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ClanMembersModel,
    entity: ClanMembersModel,
    schema: schema
};
