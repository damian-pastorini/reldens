/**
 *
 * Reldens - ResurrectionAdGate
 *
 * Accepts the resurrection ad start message only from a dead player and once per death, so its reward (the restoration
 * item) can not be collected while alive or many times in the same death. The ad counts as started only when the ads
 * system stored its start ("reldens.afterAdStarted"), the death relocator waits for the reward from that moment until
 * the ads system processed its end ("reldens.afterAdEnded", the reward is already given when it was earned) or the
 * client told its failure (a failed ad gives no reward), up to the ads videos maximum duration. The config is
 * validated once (validate), the plugin attaches the gate only when it is valid.
 *
 */

const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { ConfigProcessor } = require('../../config/processor');
const { ActionsConst } = require('../constants');
const { AdsConst } = require('../../ads/constants');
const { Logger, sc } = require('@reldens/utils');

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
     * @returns {boolean}
     */
    validate()
    {
        if(!(this.config instanceof ConfigProcessor)){
            Logger.error('Config is not a ConfigProcessor instance in ResurrectionAdGate.');
            return false;
        }
        return true;
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
            return this.markRequestedAd(event.playerSchema, ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED);
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
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED, true);
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterAdStarted(event)
    {
        if(
            !this.isResurrectionAdMessage(event.messageData)
            || !event.playerSchema?.isDeath()
            || !event.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED)
        ){
            return false;
        }
        event.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, Date.now());
        return true;
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
        return this.markRequestedAd(event.playerSchema, ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_ENDED);
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
     * @returns {boolean}
     */
    markRequestedAd(playerSchema, privateDataKey)
    {
        if(!playerSchema || !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED)){
            return false;
        }
        playerSchema.setPrivate(privateDataKey, true);
        return true;
    }

}

module.exports.ResurrectionAdGate = ResurrectionAdGate;
