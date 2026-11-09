/**
 *
 * Reldens - ResurrectionAdGate
 *
 * Accepts the resurrection ad start message only from a dead player and once per death, so its reward (the restoration
 * item) can not be collected while alive or many times in the same death. The accepted start keeps its time, so the
 * death relocator already waits while the ads system checks and stores it; the ads system result
 * ("reldens.afterAdStarted") marks the ad started from its stored time or failed when the start was rejected. The wait
 * lasts until the ads system processed the ad end ("reldens.afterAdEnded", the reward is already given when it was
 * earned) or the client told its failure (a failed ad gives no reward), up to the ads videos maximum duration. The
 * config comes from the actions plugin, which validates it once before it creates this class.
 *
 */

const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { ActionsConst } = require('../constants');
const { AdsConst } = require('../../ads/constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../config/processor').ConfigProcessor} ConfigProcessor
 */
class ResurrectionAdGate
{

    /**
     * @param {Object} props
     * @param {ConfigProcessor} props.config
     */
    constructor(props)
    {
        /** @type {ConfigProcessor|boolean} */
        this.config = sc.get(props, 'config', false);
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
            return this.markRequestedAd(
                event.playerSchema,
                ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED,
                true
            );
        }
        let playerSchema = event.playerSchema;
        if(
            !playerSchema
            || !playerSchema.isDeath()
            || playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED)
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
        if(!this.isResurrectionAdMessage(event.messageData)){
            return false;
        }
        return this.markRequestedAd(
            event.playerSchema,
            event.startResult
                ? ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED
                : ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED,
            event.startResult ? Date.now() : true
        );
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterAdEnded(event)
    {
        if(!this.isResurrectionAdMessage(event.messageData)){
            return false;
        }
        return this.markRequestedAd(
            event.playerSchema,
            ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_ENDED,
            true
        );
    }

    /**
     * @param {Object} messageData
     * @returns {boolean}
     */
    isResurrectionAdMessage(messageData)
    {
        return AdsCollectionFinder.isMessageForAd(
            this.config,
            this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY, ''),
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
