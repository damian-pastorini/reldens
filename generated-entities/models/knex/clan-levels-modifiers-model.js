/**
 *
 * Reldens - ClanLevelsModifiersModel
 *
 */

class ClanLevelsModifiersModel
{

    static get tableName()
    {
        return 'clan_levels_modifiers';
    }

    static get relationMappings()
    {
        return {
            related_clan_levels: {
                relation: 'BelongsToOneRelation',
                tableName: 'clan_levels',
                from: 'level_id',
                to: 'id'
            },
            related_operation_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'operation_types',
                from: 'operation',
                to: 'key'
            }
        };
    }
}

module.exports.ClanLevelsModifiersModel = ClanLevelsModifiersModel;
