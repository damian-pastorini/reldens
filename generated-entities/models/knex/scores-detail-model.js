/**
 *
 * Reldens - ScoresDetailModel
 *
 */

class ScoresDetailModel
{

    static get tableName()
    {
        return 'scores_detail';
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

module.exports.ScoresDetailModel = ScoresDetailModel;
