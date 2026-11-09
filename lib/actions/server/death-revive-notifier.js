/**
 *
 * Reldens - DeathReviveNotifier
 *
 * Tells the dead player how it will be revived, the client shows it in the game over box: where it died when the death
 * teleport is disabled, where it died consuming the restoration item it carries (consumed automatically or chosen by
 * the player), the question to use or keep that item when it is not consumed automatically, or in the town room. On
 * the town revive without restoration item the enabled resurrection ad is offered with its own event key (the client
 * fires it only when the player asks for the ad, so the stored ads_event_video event key always plays it), its reward
 * is the restoration item and watching it is the choice to use it, so the player is told again when that reward reaches
 * it while it is still dead. When the auto revive is disabled the message also carries the seconds left to the revive
 * or, once that time passed, that the player can ask for the revive; the player is told again on that time and after
 * every restoration item choice. The config and the death relocator come from the actions plugin, which validates the
 * config once and creates the relocator, so they are never checked here.
 *
 */

const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { ActionsConst } = require('../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./player-death-relocator').PlayerDeathRelocator} PlayerDeathRelocator
 * @typedef {import('../../config/processor').ConfigProcessor} ConfigProcessor
 */
class DeathReviveNotifier
{

    /**
     * @param {Object} props
     * @param {ConfigProcessor} props.config
     * @param {PlayerDeathRelocator} props.playerDeathRelocator
     */
    constructor(props)
    {
        /** @type {ConfigProcessor|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {PlayerDeathRelocator|boolean} */
        this.playerDeathRelocator = sc.get(props, 'playerDeathRelocator', false);
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterGiveAdRewardItem(event)
    {
        let playerSchema = event.playerSchema;
        let resurrectionAdsKey = this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY, '');
        if(
            !playerSchema
            || !playerSchema.isDeath()
            || !resurrectionAdsKey
            || resurrectionAdsKey !== event.playedAd?.key
        ){
            return false;
        }
        playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE,
            ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
        );
        return this.notifyClient(event.room.getClientById(playerSchema.sessionId), playerSchema);
    }

    /**
     * @param {Object|boolean} client
     * @param {Object|boolean} playerSchema
     * @returns {boolean}
     */
    notifyClient(client, playerSchema)
    {
        if(!client || !playerSchema || !playerSchema.isDeath()){
            return false;
        }
        client.send('*', Object.assign(
            {act: ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE},
            this.createReviveModeData(playerSchema),
            this.createReviveTimeData(playerSchema)
        ));
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @returns {Object}
     */
    createReviveModeData(playerSchema)
    {
        if(!this.playerDeathRelocator.isTeleportEnabled()){
            return {mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE};
        }
        let restorationItem = this.playerDeathRelocator.findRestorationItem(playerSchema);
        if(restorationItem && this.playerDeathRelocator.isRestorationItemUsed(playerSchema)){
            return {mode: ActionsConst.DEATH.REVIVE_MODES.RESTORATION_ITEM, itemLabel: restorationItem.label};
        }
        let townLabel = sc.get(this.playerDeathRelocator.townRoom, 'roomTitle', '');
        if(restorationItem && this.playerDeathRelocator.isRestorationItemQuestionOpen(playerSchema)){
            return {
                mode: ActionsConst.DEATH.REVIVE_MODES.ASK_RESTORATION_ITEM,
                itemLabel: restorationItem.label,
                townLabel
            };
        }
        return {
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel,
            resurrectionAdEventKey: restorationItem ? '' : sc.get(
                AdsCollectionFinder.findByKey(
                    this.config,
                    this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY, '')
                ),
                'eventKey',
                ''
            )
        };
    }

    /**
     * @param {Object} playerSchema
     * @returns {Object}
     */
    createReviveTimeData(playerSchema)
    {
        if(this.playerDeathRelocator.isAutoReviveEnabled()){
            return {};
        }
        if(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY)){
            return {reviveReady: true};
        }
        return {reviveWaitSeconds: this.playerDeathRelocator.fetchReviveWaitSeconds(playerSchema)};
    }

}

module.exports.DeathReviveNotifier = DeathReviveNotifier;
