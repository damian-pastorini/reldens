/**
 *
 * Reldens - ClanModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ClanModel
{

    constructor(id, owner_id, name, points, level, created_at, updated_at)
    {
        this.id = id;
        this.owner_id = owner_id;
        this.name = name;
        this.points = points;
        this.level = level;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, owner_id, name, points, level, created_at, updated_at} = props;
        return new this(id, owner_id, name, points, level, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: ClanModel,
    tableName: 'clan',
    properties: {
        id: { type: 'number', primary: true },
        owner_id: { type: 'number', persist: false },
        name: { type: 'string' },
        points: { type: 'number', nullable: true },
        level: { type: 'number', persist: false },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'owner_id'
        },
        related_clan_levels: {
            kind: 'm:1',
            entity: 'ClanLevelsModel',
            joinColumn: 'level'
        },
        related_clan_members: {
            kind: '1:m',
            entity: 'ClanMembersModel',
            mappedBy: 'related_clan'
        }
    },
});
schema._fkMappings = {
    "owner_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "level": {
        "relationKey": "related_clan_levels",
        "entityName": "ClanLevelsModel",
        "referencedColumn": "key",
        "nullable": false
    }
};
module.exports = {
    ClanModel,
    entity: ClanModel,
    schema: schema
};
