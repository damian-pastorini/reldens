/**
 *
 * Reldens - ClanModel
 *
 */

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

    static get tableName()
    {
        return 'clan';
    }
    

    static get relationTypes()
    {
        return {
            clan_levels: 'one',
            players: 'one',
            clan_members: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players': 'players',
            'related_clan_levels': 'clan_levels',
            'related_clan_members': 'clan_members'
        };
    }
}

module.exports.ClanModel = ClanModel;
