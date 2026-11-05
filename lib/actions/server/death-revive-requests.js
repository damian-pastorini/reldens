/**
 *
 * Reldens - DeathReviveRequests
 *
 * Receives the dead player answers from the game over box: the restoration item choice (use it to be revived where it
 * died, or keep it and be revived in the town room) when the restoration item is not consumed automatically, and the
 * revive request once the game over time passed when the auto revive is disabled. The choice must be a boolean, it is
 * accepted once per death and the player is told the chosen revive; the revive request is accepted once, only after
 * that time. Both are read before the room message actions, so a room with its actions disabled can not leave a dead
 * player waiting forever.
 *
 */

const { ActionsConst } = require('../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./player-death-relocator').PlayerDeathRelocator} PlayerDeathRelocator
 * @typedef {import('./death-revive-notifier').DeathReviveNotifier} DeathReviveNotifier
 */
class DeathReviveRequests
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
     * @returns {Promise<boolean>}
     */
    async onBeforeSceneExecuteMessages(event)
    {
        let messageAction = event.messageData?.act;
        if(ActionsConst.DEATH.ACTIONS.REVIVE_REQUEST === messageAction){
            return await this.playerDeathRelocator.requestRevive(event.playerSchema, event.room);
        }
        if(ActionsConst.DEATH.ACTIONS.RESTORATION_ITEM_CHOICE !== messageAction){
            return false;
        }
        let useRestorationItem = event.messageData.use;
        if(true !== useRestorationItem && false !== useRestorationItem){
            return false;
        }
        if(!this.playerDeathRelocator.chooseRestorationItem(event.playerSchema, event.room, useRestorationItem)){
            return false;
        }
        return await this.deathReviveNotifier.notifyClient(event.client, event.playerSchema, event.room);
    }

}

module.exports.DeathReviveRequests = DeathReviveRequests;
