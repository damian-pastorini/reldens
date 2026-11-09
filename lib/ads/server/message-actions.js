/**
 *
 * Reldens - AdsMessageActions
 *
 * Handles ad-related message actions including ad start/end events and reward distribution.
 * Only the enabled ads (and enabled providers) can be started and rewarded, a replay ad can be started again only after
 * its replay cooldown, an ad ended before its minimum duration is not closed nor rewarded, a failed ad is closed without
 * reward, and the player disabled by an ad start is activated again after the videos maximum duration. The
 * "reldens.beforeGiveAdRewardItem" subscribers can cancel the reward of a valid ended ad (continueEvent false), the
 * played ad stays closed. The "reldens.afterGiveAdRewardItem" subscribers are told when the reward item was given.
 * The "reldens.afterAdStarted" subscribers are told when an ad start message was processed, with its start result (the
 * stored played ad, or false when the start was rejected or failed), and the "reldens.afterAdEnded" subscribers when an
 * ad end message was processed, with its claim result (the reward item, or false when no reward was given), so a
 * feature waiting for an ad knows when it really started, when its start was rejected and when it is over.
 *
 */

const { GiveRewardAction } = require('../../rewards/server/actions/give-reward-action');
const { AdsCollectionFinder } = require('./ads-collection-finder');
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
 * @property {Object} [config] - The config manager instance
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
        /** @type {AdsPlugin|false} */
        this.adsPlugin = sc.get(props, 'adsPlugin', false);
        /** @type {Object|false} */
        this.config = sc.get(props, 'config', false);
        /** @type {GiveRewardAction} */
        this.giveRewardAction = new GiveRewardAction();
        /** @type {Object<string, boolean>} */
        this.pendingAdEndedClaims = {};
        /** @type {Object|false} */
        this.adsPlayedRepository = false;
        /** @type {Object} */
        this.adsCollection = {};
        /** @type {number} */
        this.videosMaximumDuration = AdsConst.VIDEOS_MAXIMUM_DURATION;
        /** @type {Object<string, number>} */
        this.providersMinimumDurations = {};
        this.validateProperties();
        this.setRepository();
        this.loadConfig();
    }

    validateProperties()
    {
        if(!this.dataServer){
            Logger.error('DataServer undefined in AdsMessageActions.');
        }
        if(!this.dataServer){
            Logger.error('AdsPlugin undefined in AdsMessageActions.');
        }
        if(!this.config){
            Logger.error('Missing config in AdsMessageActions.');
        }
    }

    /**
     * @returns {boolean|void}
     */
    loadConfig()
    {
        if(!this.config){
            return false;
        }
        this.adsCollection = this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.COLLECTION, {});
        this.videosMaximumDuration = this.config.getWithoutLogs(
            AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION,
            AdsConst.VIDEOS_MAXIMUM_DURATION
        );
        let providers = this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.PROVIDERS, {});
        for(let providerKey of Object.keys(providers)){
            this.providersMinimumDurations[providerKey] = sc.get(
                providers[providerKey],
                AdsConst.CONFIG_PATHS.VIDEO_MINIMUM_DURATION,
                AdsConst.VIDEOS_MINIMUM_DURATION
            );
        }
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
     * @param {boolean} [resetEndedAt]
     * @returns {Promise<Object|false>}
     */
    async upsertPlayedAd(playerId, adId, startedAt = null, endedAt = null, resetEndedAt = false)
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
        if(resetEndedAt){
            newAdData['ended_at'] = null;
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
        if(!this.dataServer || !this.adsPlugin || !this.config){
            return false;
        }
        await this.adStart(data, room, playerSchema);
        await this.adEnded(data, room, playerSchema);
        await this.adFailed(data, room, playerSchema);
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
        let startResult = await this.processAdStart(data, room, playerSchema).catch((error) => {
            Logger.error('Ad started process error.', playerSchema.player_id, data.ads_id, error.message);
            return false;
        });
        await room.events.emit('reldens.afterAdStarted', {messageData: data, room, playerSchema, startResult});
        return startResult;
    }

    /**
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<Object|false>}
     */
    async processAdStart(data, room, playerSchema)
    {
        let startedAd = AdsCollectionFinder.findById(this.adsCollection, data.ads_id);
        if(!startedAd){
            Logger.info('Ad started for an unavailable ad.', playerSchema.player_id, data.ads_id);
            return false;
        }
        if(!await this.canStartAd(startedAd, playerSchema.player_id)){
            return false;
        }
        if(!playerSchema.isDeath()){
            room.deactivatePlayer(playerSchema, GameConst.STATUS.DISABLED);
            this.scheduleReactivation(room, playerSchema);
        }
        let saveResult = await this.upsertPlayedAd(
            playerSchema.player_id,
            startedAd.id,
            sc.getCurrentDate(),
            null,
            Boolean(startedAd.replay)
        );
        if(!saveResult){
            Logger.critical('Ad started save error.', data, playerSchema.player_id);
        }
        return saveResult;
    }

    /**
     * @param {Object} startedAd
     * @param {number} playerId
     * @returns {Promise<boolean>}
     */
    async canStartAd(startedAd, playerId)
    {
        let playedAdModel = await this.loadPlayedAd(playerId, startedAd.id);
        if(!playedAdModel?.ended_at){
            return true;
        }
        if(!startedAd.replay){
            Logger.info('Ad already played, it can not be started again.', playerId, startedAd.id);
            return false;
        }
        let replayCooldown = Number(sc.get(startedAd, 'replayCooldown', AdsConst.REPLAY_COOLDOWN));
        let currentTime = (new Date(sc.getCurrentDate())).getTime();
        if(currentTime - (new Date(playedAdModel.ended_at)).getTime() < replayCooldown){
            Logger.info('Ad replay cooldown in progress.', playerId, startedAd.id);
            return false;
        }
        return true;
    }

    /**
     * @param {Object} room
     * @param {Object} playerSchema
     */
    scheduleReactivation(room, playerSchema)
    {
        clearTimeout(playerSchema.getPrivate(AdsConst.PRIVATE_DATA.REACTIVATION_TIMER));
        playerSchema.setPrivate(
            AdsConst.PRIVATE_DATA.REACTIVATION_TIMER,
            setTimeout(
                () => {
                    if(!room.activePlayerBySessionId(playerSchema.sessionId, room.roomId)){
                        return false;
                    }
                    return this.reactivateDisabledPlayer(room, playerSchema);
                },
                this.videosMaximumDuration
            )
        );
    }

    /**
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    reactivateDisabledPlayer(room, playerSchema)
    {
        clearTimeout(playerSchema.getPrivate(AdsConst.PRIVATE_DATA.REACTIVATION_TIMER));
        playerSchema.setPrivate(AdsConst.PRIVATE_DATA.REACTIVATION_TIMER, false);
        if(!playerSchema.isDisabled()){
            return false;
        }
        room.activatePlayer(playerSchema, GameConst.STATUS.ACTIVE);
        return true;
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
        this.reactivateDisabledPlayer(room, playerSchema);
        let claimKey = playerSchema.player_id+'_'+data.ads_id;
        if(this.pendingAdEndedClaims[claimKey]){
            Logger.info('Ad ended already in process.', playerSchema.player_id, data.ads_id);
            return false;
        }
        this.pendingAdEndedClaims[claimKey] = true;
        let claimResult = await this.processAdEnded(data, room, playerSchema).catch((error) => {
            Logger.error('Ad ended process error.', playerSchema.player_id, data.ads_id, error.message);
            return false;
        });
        delete this.pendingAdEndedClaims[claimKey];
        await room.events.emit('reldens.afterAdEnded', {messageData: data, room, playerSchema, claimResult});
        return claimResult;
    }

    /**
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<Object|boolean>}
     */
    async processAdEnded(data, room, playerSchema)
    {
        let playedAd = AdsCollectionFinder.findById(this.adsCollection, data.ads_id);
        if(!playedAd){
            Logger.info('Ad ended for an unavailable ad.', playerSchema.player_id, data.ads_id);
            return false;
        }
        let startedPlayedAdModel = await this.loadPlayedAd(playerSchema.player_id, playedAd.id);
        if(!startedPlayedAdModel){
            Logger.info('Ad ended without a started record.', playerSchema.player_id, playedAd.id);
            return false;
        }
        if(startedPlayedAdModel.ended_at){
            Logger.info('Ad already ended, reward can not be claimed again.', playerSchema.player_id, playedAd.id);
            return false;
        }
        let startedTime = (new Date(startedPlayedAdModel.started_at)).getTime();
        if((new Date(sc.getCurrentDate())).getTime() - startedTime < this.providersMinimumDurations[playedAd.provider.key]){
            Logger.info('Invalid reward duration.', playerSchema.player_id, playedAd.id);
            return false;
        }
        let saveResult = await this.upsertPlayedAd(playerSchema.player_id, playedAd.id, null, sc.getCurrentDate());
        if(!saveResult){
            Logger.critical('Ad ended save error.', data, playerSchema.player_id);
            return false;
        }
        if(!playedAd.rewardItemKey){
            Logger.info('Reward item not specified.');
            return false;
        }
        let rewardEventData = {playedAd, room, playerSchema, continueEvent: true};
        await room.events.emit('reldens.beforeGiveAdRewardItem', rewardEventData);
        if(!rewardEventData.continueEvent){
            Logger.info('Ad reward canceled by a subscriber.', playerSchema.player_id, playedAd.id);
            return false;
        }
        let rewardResult = await this.giveRewardItem(playerSchema, playedAd);
        if(!rewardResult){
            return rewardResult;
        }
        await room.events.emit('reldens.afterGiveAdRewardItem', {playedAd, room, playerSchema, rewardResult});
        return rewardResult;
    }

    /**
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean>}
     */
    async adFailed(data, room, playerSchema)
    {
        if(data.act !== AdsConst.ACTIONS.AD_FAILED){
            return false;
        }
        this.reactivateDisabledPlayer(room, playerSchema);
        let failedAd = AdsCollectionFinder.findById(this.adsCollection, data.ads_id);
        if(!failedAd){
            return false;
        }
        let startedPlayedAdModel = await this.loadPlayedAd(playerSchema.player_id, failedAd.id);
        if(!startedPlayedAdModel || startedPlayedAdModel.ended_at){
            return false;
        }
        Logger.info('Ad failed, closed without reward.', playerSchema.player_id, failedAd.id);
        return Boolean(await this.upsertPlayedAd(playerSchema.player_id, failedAd.id, null, sc.getCurrentDate()));
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
