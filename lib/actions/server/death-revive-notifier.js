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
 * every restoration item choice.
 *
 */

const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { ActionsConst } = require('../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./player-death-relocator').PlayerDeathRelocator} PlayerDeathRelocator
 */
class DeathReviveNotifier
{

    /**
     * @param {Object} props
     * @param {Object} props.config
     * @param {PlayerDeathRelocator} props.playerDeathRelocator
     */
    constructor(props)
    {
        /** @type {Object|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {PlayerDeathRelocator|boolean} */
        this.playerDeathRelocator = sc.get(props, 'playerDeathRelocator', false);
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async onAfterGiveAdRewardItem(event)
    {
        let playerSchema = event.playerSchema;
        if(!this.canNotify(playerSchema)){
            return false;
        }
        let resurrectionAdsKey = this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY, '');
        if(!resurrectionAdsKey || resurrectionAdsKey !== event.playedAd?.key){
            return false;
        }
        this.playerDeathRelocator.acceptResurrectionAdReward(playerSchema);
        return await this.notifyClient(event.room.getClientById(playerSchema.sessionId), playerSchema, event.room);
    }

    /**
     * @param {Object|boolean} client
     * @param {Object|boolean} playerSchema
     * @param {Object} room
     * @returns {Promise<boolean>}
     */
    async notifyClient(client, playerSchema, room)
    {
        if(!client || !this.canNotify(playerSchema)){
            return false;
        }
        client.send('*', await this.createReviveMessage(playerSchema, room));
        return true;
    }

    /**
     * @param {Object|boolean} playerSchema
     * @returns {boolean}
     */
    canNotify(playerSchema)
    {
        if(!this.config || !this.playerDeathRelocator || !playerSchema){
            return false;
        }
        return playerSchema.isDeath();
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} room
     * @returns {Promise<Object>}
     */
    async createReviveMessage(playerSchema, room)
    {
        return Object.assign(
            {act: ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE},
            await this.createReviveModeData(playerSchema, room),
            this.createReviveTimeData(playerSchema)
        );
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} room
     * @returns {Promise<Object>}
     */
    async createReviveModeData(playerSchema, room)
    {
        if(!this.playerDeathRelocator.isTeleportEnabled()){
            return {mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE};
        }
        let restorationItem = this.playerDeathRelocator.findRestorationItem(playerSchema);
        if(restorationItem && this.playerDeathRelocator.isRestorationItemUsed(playerSchema)){
            return {mode: ActionsConst.DEATH.REVIVE_MODES.RESTORATION_ITEM, itemLabel: restorationItem.label};
        }
        let townLabel = sc.get(
            await room.loginManager.roomsManager.loadRoomById(this.playerDeathRelocator.fetchTownRoomId()),
            'roomTitle',
            ''
        );
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
