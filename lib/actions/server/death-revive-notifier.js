/**
 *
 * Reldens - DeathReviveNotifier
 *
 * Tells the dead player how it will be revived, the client shows it in the game over box: where it died when the death
 * teleport is disabled, where it died consuming the restoration item it carries, or in the town room. On the town
 * revive the enabled resurrection ad is offered with its own event key (the client fires it only when the player asks
 * for the ad, so the stored ads_event_video event key always plays it), its reward is
 * the restoration item, so the player is told again when that reward reaches it while it is still dead.
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
    async onPlayerDeath(event)
    {
        let playerSchema = event.targetSchema;
        if(!event.targetClient || !this.canNotify(playerSchema)){
            return false;
        }
        event.targetClient.send('*', await this.createReviveMessage(playerSchema, event.room));
        return true;
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
        let client = event.room.getClientById(playerSchema.sessionId);
        if(!client){
            return false;
        }
        client.send('*', await this.createReviveMessage(playerSchema, event.room));
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
        let act = ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE;
        if(!this.playerDeathRelocator.isTeleportEnabled()){
            return {act, mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE};
        }
        let restorationItem = this.playerDeathRelocator.findRestorationItem(playerSchema);
        if(restorationItem){
            return {act, mode: ActionsConst.DEATH.REVIVE_MODES.RESTORATION_ITEM, itemLabel: restorationItem.label};
        }
        return {
            act,
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel: sc.get(
                await room.loginManager.roomsManager.loadRoomById(this.playerDeathRelocator.fetchTownRoomId()),
                'roomTitle',
                ''
            ),
            resurrectionAdEventKey: sc.get(
                AdsCollectionFinder.findByKey(
                    this.config,
                    this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY, '')
                ),
                'eventKey',
                ''
            )
        };
    }

}

module.exports.DeathReviveNotifier = DeathReviveNotifier;
