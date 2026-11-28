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
     */
    closeRequestOrHoldRevive(event)
    {
        let messageAction = event?.messageData?.act;
        if(
            (AdsConst.ACTIONS.AD_STARTED !== messageAction && AdsConst.ACTIONS.AD_FAILED !== messageAction)
            || !AdsCollectionFinder.isMessageForAd(this.adsCollection, this.adsKey, event.messageData)
        ){
            return;
        }
        let playerSchema = event.playerSchema;
        if(AdsConst.ACTIONS.AD_FAILED === messageAction){
            let openAdState = this.fetchOpenAdState(playerSchema);
            if(openAdState){
                this.closeAd(openAdState, playerSchema, event.room, true);
            }
            return;
        }
        let adState = playerSchema && playerSchema.isDeath() ? this.fetchState(playerSchema) : false;
        if(!adState || adState.isRequested || !event.room.isAllowedAction(event.client, event.messageData, playerSchema)){
            event.canContinue = false;
            return;
        }
        adState.isRequested = true;
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_HOLD_UNTIL, Date.now() + this.maximumDuration);
    }

    /**
     * @param {Object} event
     */
    holdReviveOrCloseFailedStart(event)
    {
        let adState = this.fetchOpenAdMessageState(event);
        if(!adState){
            return;
        }
        if(!event.startResult){
            this.closeAd(adState, event.playerSchema, event.room, true);
            return;
        }
        event.playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.REVIVE_HOLD_UNTIL,
            Date.now() + this.maximumDuration
        );
    }

    /**
     * @param {Object} event
     */
    releaseReviveHold(event)
    {
        let adState = this.fetchOpenAdMessageState(event);
        if(!adState){
            return;
        }
        this.closeAd(adState, event.playerSchema, event.room, !event.claimResult);
    }

    /**
     * @param {Object} event
     */
    chooseRestorationItemUse(event)
    {
        let playerSchema = event?.playerSchema;
        if(!playerSchema || !playerSchema.isDeath() || !this.adsKey || this.adsKey !== event.playedAd?.key){
            return;
        }
        playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE,
            ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
        );
        this.events.emitSync('reldens.deathReviveNotify', {playerSchema, room: event.room});
    }

    /**
     * @param {Object} event
     */
    appendResurrectionAdOffer(event)
    {
        if(
            event.hasRestorationItem
            || this.fetchState(event.playerSchema).isClosed
            || !this.isAllowedInRoom(event.client, event.playerSchema, event.room)
        ){
            return;
        }
        event.reviveData.resurrectionAdEventKey = sc.get(
            AdsCollectionFinder.findByKey(this.adsCollection, this.adsKey),
            'eventKey',
            ''
        );
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
     * @param {ResurrectionAdState} adState
     * @param {Object} playerSchema
     * @param {Object} room
     * @param {boolean} isReviveNotified
     */
    closeAd(adState, playerSchema, room, isReviveNotified)
    {
        adState.isClosed = true;
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_HOLD_UNTIL, 0);
        if(isReviveNotified){
            this.events.emitSync('reldens.deathReviveNotify', {playerSchema, room});
        }
    }

    /**
     * @param {Object|boolean} playerSchema
     * @returns {ResurrectionAdState|boolean}
     */
    fetchOpenAdState(playerSchema)
    {
        let adState = playerSchema ? this.fetchState(playerSchema) : false;
        return adState && adState.isRequested && !adState.isClosed ? adState : false;
    }

    /**
     * @param {Object} event
     * @returns {ResurrectionAdState|boolean}
     */
    fetchOpenAdMessageState(event)
    {
        return AdsCollectionFinder.isMessageForAd(this.adsCollection, this.adsKey, event?.messageData)
            ? this.fetchOpenAdState(event.playerSchema)
            : false;
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
