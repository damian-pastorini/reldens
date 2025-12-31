/**
 *
 * Reldens - CreatePlayerAdsHandler
 *
 * Handles player creation events to load and send played ads data to the client.
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
