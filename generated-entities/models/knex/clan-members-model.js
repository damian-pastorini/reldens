/**
 *
 * Reldens - ClanMembersModel
 *
 */

class ClanMembersModel
{

    static get tableName()
    {
        return 'clan_members';
    }

    static get relationMappings()
    {
        return {
            related_clan: {
                relation: 'BelongsToOneRelation',
                tableName: 'clan',
                from: 'clan_id',
                to: 'id'
            },
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'player_id',
                to: 'id'
            }
        };
    }
}

module.exports.ClanMembersModel = ClanMembersModel;
