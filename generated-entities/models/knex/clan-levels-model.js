/**
 *
 * Reldens - ClanLevelsModel
 *
 */

class ClanLevelsModel
{

    static get tableName()
    {
        return 'clan_levels';
    }

    static get relationMappings()
    {
        return {
            related_clan: {
                relation: 'HasManyRelation',
                tableName: 'clan',
                from: 'key',
                to: 'level'
            },
            related_clan_levels_modifiers: {
                relation: 'HasManyRelation',
                tableName: 'clan_levels_modifiers',
                from: 'id',
                to: 'level_id'
            }
        };
    }
}

module.exports.ClanLevelsModel = ClanLevelsModel;
