/**
 *
 * Reldens - SkinAdTicketGate
 *
 * Using the skin ticket item asks the client to play the skin ad instead of the item normal use, and the skin ad start
 * message is accepted only from a player carrying a ticket. The ticket is consumed only when the ended ad is rewarded
 * (the skin item comes from the ads event video data), so every reward costs one ticket, a failed ad keeps it and a
 * player without the ticket at the end gets no reward.
 *
 */

const { AdsCollectionFinder } = require('../../ads/server/ads-collection-finder');
const { UsersConst } = require('../constants');
const { InventoryConst } = require('../../inventory/constants');
const { AdsConst } = require('../../ads/constants');

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
        return false;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async onBeforeGiveAdRewardItem(event)
    {
        if(this.config.getWithoutLogs(UsersConst.SKINS.CONFIG_PATHS.ADS_KEY, '') !== event.playedAd.key){
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
        await event.playerSchema.inventory.manager.decreaseItemQty(
            ticketItem.getInventoryId(),
            InventoryConst.CONSUMED_ITEM_QTY
        );
        return true;
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
        let skinAd = AdsCollectionFinder.findByKey(
            this.config,
            this.config.getWithoutLogs(UsersConst.SKINS.CONFIG_PATHS.ADS_KEY, '')
        );
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
        let skinAdsKey = this.config.getWithoutLogs(UsersConst.SKINS.CONFIG_PATHS.ADS_KEY, '');
        if(!AdsCollectionFinder.isMessageForAd(this.config, skinAdsKey, event.messageData)){
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
     * @param {Object} playerSchema
     * @returns {Object|boolean}
     */
    findTicketItem(playerSchema)
    {
        let ticketItemKey = this.config.getWithoutLogs(UsersConst.SKINS.CONFIG_PATHS.AD_TICKET_ITEM_KEY, '');
        if(!ticketItemKey){
            return false;
        }
        return playerSchema?.inventory?.manager?.findItemByKey(ticketItemKey) || false;
    }

}

module.exports.SkinAdTicketGate = SkinAdTicketGate;
