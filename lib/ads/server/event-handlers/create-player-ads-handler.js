/**
 *
 * Reldens - CreatePlayerAdsHandler
 *
 * Handles player creation events to load and send played ads data to the client. The list is sent even when the
 * player never played an ad, since the client video providers wait for it before requesting their first ad.
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
        /** @type {Object<number, Array<Object>>} */
        this.adsByPlayerId = {};
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
        if(!this.adsByPlayerId[playerSchema.player_id]){
            this.adsByPlayerId[playerSchema.player_id] = await this.adsPlayedRepository.loadByWithRelations(
                'player_id',
                playerSchema.player_id,
                ['related_players']
            ) || [];
        }
        playerSchema.setCustom('playedAds', this.adsByPlayerId[playerSchema.player_id]);
        await client.send('*', {
            act: AdsConst.ACTIONS.ADS_PLAYED,
            playedAdsModels: this.adsByPlayerId[playerSchema.player_id]
        });
    }

}

module.exports.CreatePlayerAdsHandler = CreatePlayerAdsHandler;
