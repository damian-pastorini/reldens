/**
 *
 * Reldens - ResurrectionAdGate
 *
 * Accepts the resurrection ad start message only from a dead player and once per death, so its reward (the restoration
 * item) can not be collected while alive or many times in the same death, and only when the room allows that message
 * (a room with every action disabled never runs the ads messages, so the death resolution never waits for an ad end
 * that can not be processed). The accepted start keeps its time, so the
 * death relocator already waits while the ads system checks and stores it; the ads system result
 * ("reldens.afterAdStarted") marks the ad started from its stored time or failed when the start was rejected. The wait
 * lasts until the ads system processed the ad end ("reldens.afterAdEnded", the reward is already given when it was
 * earned) or the client told its failure (a failed ad gives no reward), up to the ads videos maximum duration. A
 * requested ad that failed, was rejected or ended without reward can not be played again in that death, so the dead
 * player is told its revive again (DeathReviveNotifier) and the game over box no longer offers it. The resurrection ad
 * key and the ads collection come from the death relocator, which reads them once.
 *
 */

const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { ActionsConst } = require('../constants');
const { AdsConst } = require('../../ads/constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./player-death-relocator').PlayerDeathRelocator} PlayerDeathRelocator
 * @typedef {import('./death-revive-notifier').DeathReviveNotifier} DeathReviveNotifier
 */
class ResurrectionAdGate
{

    /**
     * @param {Object} props
     * @param {PlayerDeathRelocator} props.playerDeathRelocator
     * @param {DeathReviveNotifier} props.deathReviveNotifier
     */
    constructor(props)
    {
        /** @type {PlayerDeathRelocator|boolean} */
        this.playerDeathRelocator = sc.get(props, 'playerDeathRelocator', false);
        /** @type {DeathReviveNotifier|boolean} */
        this.deathReviveNotifier = sc.get(props, 'deathReviveNotifier', false);
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onBeforeSceneExecuteMessages(event)
    {
        let messageAction = event?.messageData?.act;
        if(
            (AdsConst.ACTIONS.AD_STARTED !== messageAction && AdsConst.ACTIONS.AD_FAILED !== messageAction)
            || !this.isResurrectionAdMessage(event.messageData)
        ){
            return false;
        }
        if(AdsConst.ACTIONS.AD_FAILED === messageAction){
            return this.closeRequestedAd(event, ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED);
        }
        let playerSchema = event.playerSchema;
        if(
            !playerSchema
            || !playerSchema.isDeath()
            || playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED)
            || !event.room.isAllowedAction(event.client, event.messageData, playerSchema)
        ){
            event.canContinue = false;
            return false;
        }
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED, Date.now());
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterAdStarted(event)
    {
        if(!this.isResurrectionAdMessage(event?.messageData)){
            return false;
        }
        if(!event.startResult){
            return this.closeRequestedAd(event, ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED);
        }
        return this.markRequestedAd(
            event.playerSchema,
            ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, Date.now()
        );
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterAdEnded(event)
    {
        if(!this.isResurrectionAdMessage(event?.messageData)){
            return false;
        }
        if(!event.claimResult){
            return this.closeRequestedAd(event, ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_ENDED);
        }
        return this.markRequestedAd(event.playerSchema, ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_ENDED, true);
    }

    /**
     * @param {Object} event
     * @param {string} privateDataKey
     * @returns {boolean}
     */
    closeRequestedAd(event, privateDataKey)
    {
        if(!this.markRequestedAd(event.playerSchema, privateDataKey, true)){
            return false;
        }
        this.deathReviveNotifier.notifyClient(
            event.room.getClientById(event.playerSchema.sessionId),
            event.playerSchema
        );
        return true;
    }

    /**
     * @param {Object} messageData
     * @returns {boolean}
     */
    isResurrectionAdMessage(messageData)
    {
        return AdsCollectionFinder.isMessageForAd(
            this.playerDeathRelocator.adsCollection,
            this.playerDeathRelocator.resurrectionAdsKey,
            messageData
        );
    }

    /**
     * @param {Object|boolean} playerSchema
     * @param {string} privateDataKey
     * @param {number|boolean} value
     * @returns {boolean}
     */
    markRequestedAd(playerSchema, privateDataKey, value)
    {
        if(!playerSchema || !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED)){
            return false;
        }
        playerSchema.setPrivate(privateDataKey, value);
        return true;
    }

}

module.exports.ResurrectionAdGate = ResurrectionAdGate;
