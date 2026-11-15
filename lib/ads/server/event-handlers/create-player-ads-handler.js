/**
 *
 * Reldens - CreatePlayerAdsHandler
 *
 * Handles player creation events to load and send played ads data to the client. The list is sent even when the
 * player never played an ad, since the client video providers wait for it before requesting their first ad. The list is
 * loaded from the storage on every join, so the ads played after the first join (on this server or another one sharing
 * the storage) are in the list of the next room join and login.
 *
 */

const { AdsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../plugin').AdsPlugin} AdsPlugin
 */
class CreatePlayerAdsHandler
{

    /**
     * @param {AdsPlugin} adsPlugin
     */
    constructor(adsPlugin)
    {
        /** @type {Object} */
        this.adsPlayedRepository = adsPlugin.dataServer.getEntity('adsPlayed');
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} client
     * @returns {Promise<boolean>}
     */
    async enrichPlayedWithPlayedAds(playerSchema, client)
    {
        if(!this.adsPlayedRepository){
            Logger.error('Missing adsPlayedRepository in "CreatePlayerAdsHandler".');
            return false;
        }
        let playedAds = await this.adsPlayedRepository.loadByWithRelations(
            'player_id',
            playerSchema.player_id,
            ['related_players']
        ) || [];
        playerSchema.setCustom('playedAds', playedAds);
        await client.send('*', {act: AdsConst.ACTIONS.ADS_PLAYED, playedAdsModels: playedAds});
    }

}

module.exports.CreatePlayerAdsHandler = CreatePlayerAdsHandler;
