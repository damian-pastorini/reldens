/**
 *
 * Reldens - ClanMembersModel
 *
 */

class ClanMembersModel
{

    constructor(id, clan_id, player_id)
    {
        this.id = id;
        this.clan_id = clan_id;
        this.player_id = player_id;
    }

    static get tableName()
    {
        return 'clan_members';
    }
    

    static get relationTypes()
    {
        return {
            clan: 'one',
            players: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_clan': 'clan',
            'related_players': 'players'
        };
    }
}

module.exports.ClanMembersModel = ClanMembersModel;
