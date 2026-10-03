/**
 *
 * Reldens - AdsPlayedModel
 *
 */

class AdsPlayedModel
{

    static get tableName()
    {
        return 'ads_played';
    }

    static get relationMappings()
    {
        return {
            related_ads: {
                relation: 'BelongsToOneRelation',
                tableName: 'ads',
                from: 'ads_id',
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

module.exports.AdsPlayedModel = AdsPlayedModel;
