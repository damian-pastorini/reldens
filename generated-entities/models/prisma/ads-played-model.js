/**
 *
 * Reldens - AdsPlayedModel
 *
 */

class AdsPlayedModel
{

    constructor(id, ads_id, player_id, started_at, ended_at)
    {
        this.id = id;
        this.ads_id = ads_id;
        this.player_id = player_id;
        this.started_at = started_at;
        this.ended_at = ended_at;
    }

    static get tableName()
    {
        return 'ads_played';
    }
    

    static get relationTypes()
    {
        return {
            ads: 'one',
            players: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_ads': 'ads',
            'related_players': 'players'
        };
    }
}

module.exports.AdsPlayedModel = AdsPlayedModel;
