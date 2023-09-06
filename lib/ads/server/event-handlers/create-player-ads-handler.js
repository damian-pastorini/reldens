/**
 *
 * Reldens - CreatePlayerAdsHandler
 *
 */

const { AdsConst } = require('../../constants');

class CreatePlayerAdsHandler
{

    static async enrichPlayedWithPlayedAds(client, userModel, playerSchema, roomScene, adsPlugin)
    {
        let playedAdsModels = await adsPlugin.dataServer.getEntity('adsPlayed').loadByWithRelations(
            'player_id',
            playerSchema.player_id,
            ['parent_player']
        );
        if(!playedAdsModels || 0 === playedAdsModels.length){
            return false;
        }
        client.send('*', {act: AdsConst.ACTIONS.ADS_PLAYED, playedAdsModels});
    }

}

module.exports.CreatePlayerAdsHandler = CreatePlayerAdsHandler;
