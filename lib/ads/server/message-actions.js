/**
 *
 * Reldens - AdsMessageActions
 *
 * Handles ad-related message actions including ad start/end events and reward distribution.
 *
 */

const { GiveRewardAction } = require('../../rewards/server/actions/give-reward-action');
const { AdsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('./plugin').AdsPlugin} AdsPlugin
 * @typedef {import('../../rewards/server/actions/give-reward-action').GiveRewardAction} GiveRewardAction
 *
 * @typedef {Object} AdsMessageActionsProps
 * @property {BaseDataServer} [dataServer] - The data server instance
 * @property {AdsPlugin} [adsPlugin] - The ads plugin instance
 */

class AdsMessageActions
{

    /**
     * @param {AdsMessageActionsProps} props
     */
    constructor(props)
    {
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in AdsMessageActions.');
        }
        /** @type {AdsPlugin|false} */
        this.adsPlugin = sc.get(props, 'adsPlugin', false);
        if(!this.dataServer){
            Logger.error('AdsPlugin undefined in AdsMessageActions.');
        }
        /** @type {GiveRewardAction} */
        this.giveRewardAction = new GiveRewardAction();
        this.setRepository();
    }

    /**
     * @returns {boolean}
     */
    setRepository()
    {
        if(!this.dataServer){
            return false;
        }
        /** @type {Object} */
        this.adsPlayedRepository = this.dataServer.getEntity('adsPlayed');
    }

    /**
     * @param {number} playerId
     * @param {number} adId
     * @returns {Promise<Object|false>}
     */
    async loadPlayedAd(playerId, adId)
    {
        if(!this.adsPlayedRepository){
            return false;
        }
        return await this.adsPlayedRepository.loadOne({player_id: playerId, ads_id: adId});
    }

    /**
     * @param {number} playerId
     * @param {number} adId
     * @param {string|null} [startedAt]
     * @param {string|null} [endedAt]
     * @returns {Promise<Object|false>}
     */
    async upsertPlayedAd(playerId, adId, startedAt = null, endedAt = null)
    {
        let newAdData = {
            player_id: playerId,
            ads_id: adId
        };
        if(null !== startedAt){
            newAdData['started_at'] = startedAt;
        }
        if(null !== endedAt){
            newAdData['ended_at'] = endedAt;
        }
        try {
            let playedAdModel = await this.loadPlayedAd(playerId, adId);
            if(!playedAdModel){
                return this.adsPlayedRepository.create(newAdData);
            }
            return this.adsPlayedRepository.updateById(playedAdModel.id, newAdData);
        } catch (error) {
            Logger.error(error.message);
            return false;
        }
    }

    /**
     * @param {Object} client
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<Object|false>}
     */
    async executeMessageActions(client, data, room, playerSchema)
    {
        if(!this.dataServer || !this.adsPlugin){
            return false;
        }
        await this.adStart(data, room, playerSchema);
        await this.adEnded(data, room, playerSchema);
        return {client, data, room, playerSchema};
    }

    /**
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<Object|false>}
     */
    async adStart(data, room, playerSchema)
    {
        if(data.act !== AdsConst.ACTIONS.AD_STARTED){
            return false;
        }
        room.deactivatePlayer(playerSchema, room, GameConst.STATUS.DISABLED);
        let saveResult = await this.upsertPlayedAd(playerSchema.player_id, data.ads_id, sc.getCurrentDate(), null);
        if(!saveResult){
            Logger.critical('Ad started save error.', data, playerSchema.player_id);
        }
        return saveResult;
    }

    /**
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean>}
     */
    async adEnded(data, room, playerSchema)
    {
        if(data.act !== AdsConst.ACTIONS.AD_ENDED){
            return false;
        }
        room.activatePlayer(playerSchema, GameConst.STATUS.ACTIVE);
        let saveResult = await this.upsertPlayedAd(playerSchema.player_id, data.ads_id, null, sc.getCurrentDate());
        if(!saveResult){
            Logger.critical('Ad ended save error.', data, playerSchema.player_id);
        }
        let playedAdModel = await this.loadPlayedAd(playerSchema.player_id, data.ads_id);
        let playedAd = sc.get(room.config.get('server/ads/collection'), data.ads_id, false);
        if(!playedAd.rewardItemKey){
            Logger.info('Reward item not specified.');
            return false;
        }
        let playedTime = (new Date(playedAdModel.ended_at)).getTime() - (new Date(playedAdModel.startedAt)).getTime();
        let minimumDuration = room.config.getWithoutLogs(
            'client/ads/general/providers/'+playedAd.provider.key+'/videoMinimumDuration',
            AdsConst.VIDEOS_MINIMUM_DURATION
        );
        if(playedTime < minimumDuration){
            Logger.info('Invalid reward duration.', playerSchema.player_id, playedAd.id);
            setTimeout(async () => {
                return await this.giveRewardItem(playerSchema, playedAd);
            }, (minimumDuration -  playedTime));
            return true;
        }
        return await this.giveRewardItem(playerSchema, playedAd);
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} playedAd
     * @returns {Promise<Object>}
     */
    async giveRewardItem(playerSchema, playedAd)
    {
        return this.giveRewardAction.execute(playerSchema, playedAd.rewardItemKey, playedAd.rewardItemQty);
    }

}

module.exports.AdsMessageActions = AdsMessageActions;
