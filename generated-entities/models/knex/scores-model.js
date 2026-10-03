/**
 *
 * Reldens - ScoresModel
 *
 */

class ScoresModel
{

    static get tableName()
    {
        return 'scores';
    }

    static get relationMappings()
    {
        return {
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'player_id',
                to: 'id'
            }
        };
    }
}

module.exports.ScoresModel = ScoresModel;
