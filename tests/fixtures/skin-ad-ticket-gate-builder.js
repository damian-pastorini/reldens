/**
 *
 * Reldens - SkinAdTicketGateBuilder
 *
 * Builds a skin ad ticket gate loaded with a skin ad and another ad, and the events the gate receives: a scene message
 * of a player carrying the given tickets quantity (none when negative), the reward of an ended ad, the ad end with its
 * claim result and a trade accept between two players with or without a reserved ticket.
 *
 */

const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { SkinAdTicketGate } = require('../../lib/users/server/skin-ad-ticket-gate');
const { UsersConst } = require('../../lib/users/constants');
const { InventoryConst } = require('../../lib/inventory/constants');
const { AdsConst } = require('../../lib/ads/constants');

class SkinAdTicketGateBuilder
{

    static SKIN_AD_ID = 8;
    static OTHER_AD_ID = 7;
    static TICKET_ITEM_KEY = 'skin_ad_ticket';
    static PARTNER_SESSION_ID = 'partner-session';

    /**
     * @param {Object} [configValues]
     * @returns {SkinAdTicketGate}
     */
    static createGate(configValues = {})
    {
        let gate = new SkinAdTicketGate({
            config: GameplayPlayerBuilder.createConfig(Object.assign({
                [UsersConst.SKINS.CONFIG_PATHS.ADS_KEY]: 'skin-ad-ticket',
                [UsersConst.SKINS.CONFIG_PATHS.AD_TICKET_ITEM_KEY]: SkinAdTicketGateBuilder.TICKET_ITEM_KEY,
                [AdsConst.CONFIG_PATHS.COLLECTION]: {
                    [SkinAdTicketGateBuilder.SKIN_AD_ID]: {
                        id: SkinAdTicketGateBuilder.SKIN_AD_ID,
                        key: 'skin-ad-ticket',
                        enabled: 1,
                        provider: {enabled: 1}
                    },
                    [SkinAdTicketGateBuilder.OTHER_AD_ID]: {
                        id: SkinAdTicketGateBuilder.OTHER_AD_ID,
                        key: 'other-video',
                        enabled: 1,
                        provider: {enabled: 1}
                    }
                }
            }, configValues))
        });
        gate.loadConfig();
        return gate;
    }

    /**
     * @param {Object} messageData
     * @param {number} ticketQty
     * @returns {Object}
     */
    static createEvent(messageData, ticketQty)
    {
        let items = {potion: GameplayPlayerBuilder.createItem('potion')};
        if(0 <= ticketQty){
            items[SkinAdTicketGateBuilder.TICKET_ITEM_KEY] = GameplayPlayerBuilder.createItem(
                SkinAdTicketGateBuilder.TICKET_ITEM_KEY,
                {qty: ticketQty}
            );
        }
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
        playerSchema.inventory = {manager: GameplayPlayerBuilder.createInventoryManager(items)};
        return {messageData, playerSchema, client: GameplayPlayerBuilder.createClient(), canContinue: true};
    }

    /**
     * @param {string} playedAdKey
     * @param {number} ticketQty
     * @returns {Object}
     */
    static createRewardEvent(playedAdKey, ticketQty)
    {
        return {
            playedAd: {key: playedAdKey},
            playerSchema: SkinAdTicketGateBuilder.createEvent({}, ticketQty).playerSchema,
            continueEvent: true
        };
    }

    /**
     * @param {Object} rewardEvent
     * @param {Object|boolean} claimResult
     * @param {number} [adId]
     * @returns {Object}
     */
    static createAdEndedEvent(rewardEvent, claimResult, adId = SkinAdTicketGateBuilder.SKIN_AD_ID)
    {
        return {
            messageData: {act: AdsConst.ACTIONS.AD_ENDED, ads_id: adId},
            playerSchema: rewardEvent.playerSchema,
            claimResult
        };
    }

    /**
     * @param {boolean} senderReserved
     * @param {boolean} partnerReserved
     * @param {string} acceptValue
     * @returns {Object}
     */
    static createTradeAcceptEvent(senderReserved, partnerReserved, acceptValue)
    {
        let event = SkinAdTicketGateBuilder.createEvent(
            {
                act: InventoryConst.ACTIONS.TRADE_ACCEPTED,
                value: acceptValue,
                id: SkinAdTicketGateBuilder.PARTNER_SESSION_ID
            },
            1
        );
        let partnerSchema = SkinAdTicketGateBuilder.createEvent({}, 1).playerSchema;
        event.playerSchema.setPrivate(UsersConst.SKINS.PRIVATE_DATA.TICKET_RESERVED, senderReserved);
        partnerSchema.setPrivate(UsersConst.SKINS.PRIVATE_DATA.TICKET_RESERVED, partnerReserved);
        event.room = {
            playerBySessionIdFromState: (sessionId) => SkinAdTicketGateBuilder.PARTNER_SESSION_ID === sessionId
                ? partnerSchema
                : false
        };
        return event;
    }

}

module.exports.SkinAdTicketGateBuilder = SkinAdTicketGateBuilder;
