/**
 *
 * Reldens - ResurrectionAdGate
 *
 * Accepts the resurrection ad start message only from a dead player and once per death, so its reward (the restoration
 * item) can not be collected while alive or many times in the same death. The accepted start time is kept on the
 * player, the death relocator waits for the reward while the ad is playing. The failure of the started ad is kept on
 * the player too, a failed ad gives no reward, so the death relocator stops waiting for it.
 *
 */

const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { ActionsConst } = require('../constants');
const { AdsConst } = require('../../ads/constants');

class ResurrectionAdGate
{

    /**
     * @param {Object} props
     * @param {Object} props.config
     */
    constructor(props)
    {
        /** @type {Object} */
        this.config = props.config;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onBeforeSceneExecuteMessages(event)
    {
        let messageAction = event.messageData?.act;
        if(AdsConst.ACTIONS.AD_STARTED !== messageAction && AdsConst.ACTIONS.AD_FAILED !== messageAction){
            return false;
        }
        let resurrectionAdsKey = this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY, '');
        if(!AdsCollectionFinder.isMessageForAd(this.config, resurrectionAdsKey, event.messageData)){
            return false;
        }
        if(AdsConst.ACTIONS.AD_FAILED === messageAction){
            return this.markStartedAdFailure(event.playerSchema);
        }
        let playerSchema = event.playerSchema;
        if(
            !playerSchema
            || !playerSchema.isDeath()
            || playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED)
        ){
            event.canContinue = false;
            return false;
        }
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, Date.now());
        return true;
    }

    /**
     * @param {Object|boolean} playerSchema
     * @returns {boolean}
     */
    markStartedAdFailure(playerSchema)
    {
        if(!playerSchema || !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED)){
            return false;
        }
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED, true);
        return true;
    }

}

module.exports.ResurrectionAdGate = ResurrectionAdGate;
