/**
 *
 * Reldens - DeathReviveNotifier
 *
 * Tells the dead player how it will be revived (in place, with the restoration item, the question to use it, or in the
 * town room) and, with the auto revive disabled, the seconds left or that it can ask for the revive. The town revive
 * data goes through the "reldens.deathTownReviveData" subscribers, so other features can add their options to it.
 *
 */

const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('./player-death-relocator').PlayerDeathRelocator} PlayerDeathRelocator
 */
class DeathReviveNotifier
{

    /**
     * @param {Object} props
     * @param {PlayerDeathRelocator} props.playerDeathRelocator
     * @param {EventsManager} props.events
     */
    constructor(props)
    {
        /** @type {PlayerDeathRelocator|boolean} */
        this.playerDeathRelocator = sc.get(props, 'playerDeathRelocator', false);
        /** @type {EventsManager} */
        this.events = props.events;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    notifyJoinedClient(event)
    {
        if(GameConst.CLIENT_JOINED !== event.messageData[GameConst.ACTION_KEY] || !event.playerSchema.isDeath()){
            return false;
        }
        event.client.send('*', {act: GameConst.GAME_OVER});
        return this.notifyClient(event.client, event.playerSchema, event.room);
    }

    /**
     * @param {Object|boolean} client
     * @param {Object|boolean} playerSchema
     * @param {Object} room
     * @returns {boolean}
     */
    notifyClient(client, playerSchema, room)
    {
        if(!client || !playerSchema || !playerSchema.isDeath()){
            return false;
        }
        client.send('*', Object.assign(
            {act: ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE},
            this.createReviveModeData(playerSchema, client, room),
            this.createReviveTimeData(playerSchema)
        ));
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} client
     * @param {Object} room
     * @returns {Object}
     */
    createReviveModeData(playerSchema, client, room)
    {
        if(!this.playerDeathRelocator.teleportEnabled){
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
        let reviveData = {mode: ActionsConst.DEATH.REVIVE_MODES.TOWN, townLabel};
        this.events.emitSync('reldens.deathTownReviveData', {
            playerSchema,
            client,
            room,
            hasRestorationItem: Boolean(restorationItem),
            reviveData
        });
        return reviveData;
    }

    /**
     * @param {Object} playerSchema
     * @returns {Object}
     */
    createReviveTimeData(playerSchema)
    {
        if(this.playerDeathRelocator.autoReviveEnabled){
            return {};
        }
        if(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY)){
            return {reviveReady: true};
        }
        return {reviveWaitSeconds: this.playerDeathRelocator.fetchReviveWaitSeconds(playerSchema)};
    }

}

module.exports.DeathReviveNotifier = DeathReviveNotifier;
