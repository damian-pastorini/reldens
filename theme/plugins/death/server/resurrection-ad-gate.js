/**
 *
 * Reldens - Theme - ResurrectionAdGate
 *
 * Accepts the resurrection ad start message only from a dead player and once per death, so its reward (the restoration
 * item) can not be collected while alive or many times in the same death. The accepted start time is kept on the
 * player, the death relocator waits for the reward while the ad is playing.
 *
 */

const { AdsCollectionFinder } = require('reldens/lib/ads/server/ads-collection-finder');
const { ActionsConst } = require('reldens/lib/actions/constants');
const { AdsConst } = require('reldens/lib/ads/constants');

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
        if(AdsConst.ACTIONS.AD_STARTED !== event.messageData?.act){
            return false;
        }
        let resurrectionAdsKey = this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY, '');
        if(!AdsCollectionFinder.isMessageForAd(this.config, resurrectionAdsKey, event.messageData)){
            return false;
        }
        let playerSchema = event.playerSchema;
        if(!playerSchema){
            event.canContinue = false;
            return false;
        }
        if(!playerSchema.isDeath()){
            event.canContinue = false;
            return false;
        }
        if(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED)){
            event.canContinue = false;
            return false;
        }
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, Date.now());
        return true;
    }

}

module.exports.ResurrectionAdGate = ResurrectionAdGate;
