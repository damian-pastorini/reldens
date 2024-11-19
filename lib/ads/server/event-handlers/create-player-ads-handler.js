/**
 *
 * Reldens - CreatePlayerAdsHandler
 *
 */

const { AdsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

class CreatePlayerAdsHandler
{

    constructor(adsPlugin)
    {
        this.adsPlayedRepository = adsPlugin.dataServer.getEntity('adsPlayed');
        this.adsByPlayerId = {};
    }

    async enrichPlayedWithPlayedAds(playerSchema, client)
    {
        if(!this.adsPlayedRepository){
            Logger.error('Missing adsPlayedRepository in "CreatePlayerAdsHandler".');
            return false;
        }
        if(!this.adsByPlayerId[playerSchema.player_id]){
            this.adsByPlayerId[playerSchema.player_id] = await this.adsPlayedRepository.loadByWithRelations(
                'player_id',
                playerSchema.player_id,
                ['parent_player']
            );
        }
        if(!this.adsByPlayerId[playerSchema.player_id] || 0 === this.adsByPlayerId[playerSchema.player_id].length){
            return false;
        }
        playerSchema.setCustom('playedAds', this.adsByPlayerId[playerSchema.player_id]);
        await client.send('*', {
            act: AdsConst.ACTIONS.ADS_PLAYED,
            playedAdsModels: this.adsByPlayerId[playerSchema.player_id]
        });
    }

}

module.exports.CreatePlayerAdsHandler = CreatePlayerAdsHandler;
