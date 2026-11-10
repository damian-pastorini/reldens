/**
 *
 * Reldens - SkinAdTicketGate
 *
 * Using the skin ticket item asks the client to play the skin ad instead of the item normal use, and the skin ad start
 * message is accepted only from a player carrying a ticket. The ticket is reserved (removed from the inventory) before
 * the reward of the ended ad, so it can not be traded away while the reward is given (the skin item comes from the ads
 * event video data), and it is given back when no reward was given, so every reward costs one ticket, a failed ad or a
 * failed reward keeps it and a player without the ticket at the end gets no reward. A failed skin ad sends the player
 * an error chat message, so the player knows the ticket was not exchanged nor removed.
 *
 */

const { GiveRewardAction } = require('../../rewards/server/actions/give-reward-action');
const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { MessageFactory } = require('../../chat/message-factory');
const { UsersConst } = require('../constants');
const { InventoryConst } = require('../../inventory/constants');
const { AdsConst } = require('../../ads/constants');
const { ChatConst } = require('../../chat/constants');
const { Logger } = require('@reldens/utils');

class SkinAdTicketGate
{

    /**
     * @param {Object} props
     * @param {Object} props.config
     */
    constructor(props)
    {
        /** @type {Object} */
        this.config = props.config;
        /** @type {string} */
        this.adsKey = '';
        /** @type {string} */
        this.ticketItemKey = '';
        /** @type {Object} */
        this.adsCollection = {};
        /** @type {GiveRewardAction} */
        this.giveRewardAction = new GiveRewardAction();
    }

    loadConfig()
    {
        this.adsKey = this.config.getWithoutLogs(UsersConst.SKINS.CONFIG_PATHS.ADS_KEY, '');
        this.ticketItemKey = this.config.getWithoutLogs(UsersConst.SKINS.CONFIG_PATHS.AD_TICKET_ITEM_KEY, '');
        this.adsCollection = this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.COLLECTION, {});
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async onBeforeSceneExecuteMessages(event)
    {
        let messageAction = event.messageData?.act;
        if(InventoryConst.ACTIONS.USE === messageAction){
            return this.requestSkinAd(event);
        }
        if(AdsConst.ACTIONS.AD_STARTED === messageAction){
            return this.requireTicketOnAdStart(event);
        }
        if(AdsConst.ACTIONS.AD_FAILED === messageAction){
            return this.notifyFailedSkinAd(event);
        }
        return false;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async onBeforeGiveAdRewardItem(event)
    {
        if(this.adsKey !== event.playedAd.key){
            return false;
        }
        let ticketItem = this.findTicketItem(event.playerSchema);
        if(!ticketItem){
            event.continueEvent = false;
            return false;
        }
        if(0 >= Number(ticketItem.qty)){
            event.continueEvent = false;
            return false;
        }
        let isReserved = await event.playerSchema.inventory.manager.decreaseItemQty(
            ticketItem.getInventoryId(),
            InventoryConst.CONSUMED_ITEM_QTY
        );
        if(!isReserved){
            event.continueEvent = false;
            return false;
        }
        event.playerSchema.setPrivate(UsersConst.SKINS.PRIVATE_DATA.TICKET_RESERVED, true);
        return true;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async onAfterAdEnded(event)
    {
        let playerSchema = event.playerSchema;
        if(
            !this.isSkinAdMessage(event.messageData)
            || !playerSchema.getPrivate(UsersConst.SKINS.PRIVATE_DATA.TICKET_RESERVED)
        ){
            return false;
        }
        playerSchema.setPrivate(UsersConst.SKINS.PRIVATE_DATA.TICKET_RESERVED, false);
        if(event.claimResult){
            return false;
        }
        let releaseError = '';
        let isReleased = await this.releaseTicket(playerSchema).catch((error) => {
            releaseError = error.message;
            return false;
        });
        if(!isReleased){
            Logger.critical('Reserved skin ticket could not be released.', playerSchema.player_id, releaseError);
        }
        return Boolean(isReleased);
    }

    /**
     * @param {Object} playerSchema
     * @returns {Promise<Object|boolean>}
     */
    async releaseTicket(playerSchema)
    {
        let ticketItem = this.findTicketItem(playerSchema);
        if(ticketItem){
            return await playerSchema.inventory.manager.increaseItemQty(
                ticketItem.getInventoryId(),
                InventoryConst.CONSUMED_ITEM_QTY
            );
        }
        return await this.giveRewardAction.execute(
            playerSchema,
            this.ticketItemKey,
            InventoryConst.CONSUMED_ITEM_QTY
        );
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    requestSkinAd(event)
    {
        let ticketItem = this.findTicketItem(event.playerSchema);
        if(!ticketItem){
            return false;
        }
        if(ticketItem.getInventoryId() !== event.messageData.idx){
            return false;
        }
        event.canContinue = false;
        if(0 >= Number(ticketItem.qty)){
            return false;
        }
        let skinAd = AdsCollectionFinder.findByKey(this.adsCollection, this.adsKey);
        if(!skinAd){
            return false;
        }
        event.client.send('*', {act: UsersConst.SKINS.ACTIONS.AD_START, adsId: skinAd.id});
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    requireTicketOnAdStart(event)
    {
        if(!this.isSkinAdMessage(event.messageData)){
            return false;
        }
        let ticketItem = this.findTicketItem(event.playerSchema);
        if(!ticketItem){
            event.canContinue = false;
            return false;
        }
        if(0 >= Number(ticketItem.qty)){
            event.canContinue = false;
            return false;
        }
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    notifyFailedSkinAd(event)
    {
        if(!this.isSkinAdMessage(event.messageData)){
            return false;
        }
        event.client.send('*', MessageFactory.create(ChatConst.TYPES.ERROR, UsersConst.SNIPPETS.SKIN_AD_FAILED));
        return true;
    }

    /**
     * @param {Object} messageData
     * @returns {boolean}
     */
    isSkinAdMessage(messageData)
    {
        return AdsCollectionFinder.isMessageForAd(this.adsCollection, this.adsKey, messageData);
    }

    /**
     * @param {Object} playerSchema
     * @returns {Object|boolean}
     */
    findTicketItem(playerSchema)
    {
        if(!this.ticketItemKey){
            return false;
        }
        return playerSchema?.inventory?.manager?.findItemByKey(this.ticketItemKey) || false;
    }

}

module.exports.SkinAdTicketGate = SkinAdTicketGate;
