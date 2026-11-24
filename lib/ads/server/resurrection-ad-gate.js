/**
 *
 * Reldens - ResurrectionAdGate
 *
 * Handles the resurrection ad offered to a dead player. Its start message is accepted only from a dead player, once
 * per death and when the room allows it, and holds the death revive while the ad is requested or playing, up to the
 * ads videos maximum duration. A failed, rejected or ended ad releases the hold and is not offered again in that death,
 * its reward is the choice to use the restoration item. The ads plugin reads the config values once and passes them.
 *
 */

const { AdsCollectionFinder } = require('./ads-collection-finder');
const { AdsConst } = require('../constants');
const { ActionsConst } = require('../../actions/constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 *
 * @typedef {Object} ResurrectionAdState
 * @property {Object|null} deathEvent
 * @property {boolean} isRequested
 * @property {boolean} isClosed
 *
 * @typedef {Object} ResurrectionAdGateProps
 * @property {EventsManager} events
 * @property {string} adsKey
 * @property {Object} adsCollection
 * @property {number} maximumDuration
 */
class ResurrectionAdGate
{

    /**
     * @param {ResurrectionAdGateProps} props
     */
    constructor(props)
    {
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {string} */
        this.adsKey = props.adsKey;
        /** @type {Object} */
        this.adsCollection = props.adsCollection;
        /** @type {number} */
        this.maximumDuration = props.maximumDuration;
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
            || !AdsCollectionFinder.isMessageForAd(this.adsCollection, this.adsKey, event.messageData)
        ){
            return false;
        }
        if(AdsConst.ACTIONS.AD_FAILED === messageAction){
            return this.closeRequestedAd(event.playerSchema, event.room);
        }
        let playerSchema = event.playerSchema;
        if(
            !playerSchema
            || !playerSchema.isDeath()
            || this.fetchState(playerSchema).isRequested
            || !event.room.isAllowedAction(event.client, event.messageData, playerSchema)
        ){
            event.canContinue = false;
            return false;
        }
        this.fetchState(playerSchema).isRequested = true;
        return this.holdRevive(playerSchema, Date.now() + this.maximumDuration);
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterAdStarted(event)
    {
        if(!this.isOpenAdMessage(event)){
            return false;
        }
        if(!event.startResult){
            return this.closeRequestedAd(event.playerSchema, event.room);
        }
        return this.holdRevive(event.playerSchema, Date.now() + this.maximumDuration);
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterAdEnded(event)
    {
        if(!this.isOpenAdMessage(event)){
            return false;
        }
        if(!event.claimResult){
            return this.closeRequestedAd(event.playerSchema, event.room);
        }
        this.fetchState(event.playerSchema).isClosed = true;
        return this.holdRevive(event.playerSchema, 0);
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onAfterGiveAdRewardItem(event)
    {
        let playerSchema = event?.playerSchema;
        if(!playerSchema || !playerSchema.isDeath() || !this.adsKey || this.adsKey !== event.playedAd?.key){
            return false;
        }
        playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE,
            ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
        );
        this.events.emitSync('reldens.deathReviveNotify', {playerSchema, room: event.room});
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onTownReviveData(event)
    {
        if(
            event.hasRestorationItem
            || this.fetchState(event.playerSchema).isClosed
            || !this.isAllowedInRoom(event.client, event.playerSchema, event.room)
        ){
            return false;
        }
        event.reviveData.resurrectionAdEventKey = sc.get(
            AdsCollectionFinder.findByKey(this.adsCollection, this.adsKey),
            'eventKey',
            ''
        );
        return true;
    }

    /**
     * @param {Object} client
     * @param {Object} playerSchema
     * @param {Object} room
     * @returns {boolean}
     */
    isAllowedInRoom(client, playerSchema, room)
    {
        return [AdsConst.ACTIONS.AD_STARTED, AdsConst.ACTIONS.AD_ENDED].every(
            (act) => room.isAllowedAction(client, {act}, playerSchema)
        );
    }

    /**
     * @param {Object|boolean} playerSchema
     * @param {Object} room
     * @returns {boolean}
     */
    closeRequestedAd(playerSchema, room)
    {
        if(!this.isRequestedAdOpen(playerSchema)){
            return false;
        }
        this.fetchState(playerSchema).isClosed = true;
        this.holdRevive(playerSchema, 0);
        this.events.emitSync('reldens.deathReviveNotify', {playerSchema, room});
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @param {number} holdUntil
     * @returns {boolean}
     */
    holdRevive(playerSchema, holdUntil)
    {
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_HOLD_UNTIL, holdUntil);
        return true;
    }

    /**
     * @param {Object|boolean} playerSchema
     * @returns {boolean}
     */
    isRequestedAdOpen(playerSchema)
    {
        return Boolean(playerSchema)
            && this.fetchState(playerSchema).isRequested
            && !this.fetchState(playerSchema).isClosed;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    isOpenAdMessage(event)
    {
        return AdsCollectionFinder.isMessageForAd(this.adsCollection, this.adsKey, event?.messageData)
            && this.isRequestedAdOpen(event.playerSchema);
    }

    /**
     * @param {Object} playerSchema
     * @returns {ResurrectionAdState}
     */
    fetchState(playerSchema)
    {
        let deathEvent = playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT);
        let state = playerSchema.getPrivate(AdsConst.PRIVATE_DATA.RESURRECTION_AD);
        if(!state || deathEvent !== state.deathEvent){
            state = playerSchema.setPrivate(
                AdsConst.PRIVATE_DATA.RESURRECTION_AD,
                {deathEvent, isRequested: false, isClosed: false}
            );
        }
        return state;
    }

}

module.exports.ResurrectionAdGate = ResurrectionAdGate;
