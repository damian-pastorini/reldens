/**
 *
 * Reldens - ClanModel
 *
 */

class ClanModel
{

    static get tableName()
    {
        return 'clan';
    }

    static get relationMappings()
    {
        return {
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'owner_id',
                to: 'id'
            },
            related_clan_levels: {
                relation: 'BelongsToOneRelation',
                tableName: 'clan_levels',
                from: 'level',
                to: 'key'
            },
            related_clan_members: {
                relation: 'HasManyRelation',
                tableName: 'clan_members',
                from: 'id',
                to: 'clan_id'
            }
        };
    }
}

module.exports.ClanModel = ClanModel;
