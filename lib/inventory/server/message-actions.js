/**
 *
 * Reldens - InventoryMessageActions
 *
 * Handles all inventory-related message actions from clients.
 * Processes trade requests, item usage, equipment, and inventory modifications. An equipped item is unequipped before
 * it is trashed, so its modifiers and its equip effects (like a skin) are reverted. A dead or disabled player can not use,
 * equip or unequip an item, nor start or accept a trade, and a player with its inventory locked by an open trade can
 * not use, equip or unequip an item (the locked inventory would refuse the consumed quantity while the modifiers apply,
 * and an offered item would be equipped while it stays offered). A declined invite is consumed, each invite time out
 * only cancels its own exchange, and a trade action with the partner gone cancels the exchange before any sub action.
 * A trade action is accepted only from the two players of the exchange, and an invite is accepted once. A player that
 * accepts an invite drops its own pending invite (its exchange is cancelled), so that old invite can never be accepted
 * or declined later to join or cancel the new trade.
 *
 */

const { Processor } = require('./exchange/processor');
const { ExchangeUpdateSender } = require('./exchange/exchange-update-sender');
const { KeyedOperationsLock } = require('../../game/server/memory/keyed-operations-lock');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');
const { InventoryConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');
const { ExchangePlatform } = require('@reldens/items-system');

/**
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 */
class InventoryMessageActions
{

    /**
     * @param {boolean} newExchangeCancelsActive
     */
    constructor(newExchangeCancelsActive)
    {
        /** @type {KeyedOperationsLock} */
        this.equipLock = new KeyedOperationsLock();
        /** @type {boolean} */
        this.newExchangeCancelsActive = newExchangeCancelsActive;
    }

    /**
     * @param {Client} client
     * @param {Object} data
     * @param {RoomScene} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean|void>}
     */
    async executeMessageActions(client, data, room, playerSchema)
    {
        if(!sc.isString(sc.get(data, 'act', false))){
            return false;
        }
        if(GameConst.CLOSE_UI_ACTION === data.act){
            if(!sc.hasOwn(data, 'id') || !data.id){
                return false;
            }
            if(!sc.isFunction(data.id['indexOf']) || 0 !== data.id.indexOf('trade')){
                return false;
            }
            return this.closeTradeAction(client, data, room, playerSchema);
        }
        if(
            0 !== data.act.indexOf(InventoryConst.ACTIONS.PREFIX)
            || this.isRefusedForInactivePlayer(data.act, playerSchema)
            || this.isRefusedWhileTrading(data.act, playerSchema)
        ){
            return false;
        }
        if(InventoryConst.ACTIONS.TRADE_START === data.act){
            this.tryExchangeStart(client, data, room, playerSchema);
            return true;
        }
        if(InventoryConst.ACTIONS.TRADE_ACCEPTED === data.act){
            if('1' === data.value){
                await this.startExchange(client, data, room, playerSchema);
                return true;
            }
            this.declineExchange(data, room, playerSchema);
            return true;
        }
        if(InventoryConst.ACTIONS.TRADE_ACTION === data.act){
            await this.runTradeAction(client, data, room, playerSchema);
            return true;
        }
        if(InventoryConst.ACTIONS.REMOVE === data.act){
            playerSchema.inventory.manager.removeItem(data.idx);
            return true;
        }
        if(InventoryConst.ACTIONS.USE === data.act){
            if(!sc.hasOwn(playerSchema.inventory.manager.items, data.idx)){
                Logger.info('Cannot use item, key not found: '+data.idx);
                return false;
            }
            if(!sc.isFunction(playerSchema.inventory.manager.items[data.idx].use)){
                Logger.info('Cannot use item, the item is not usable: '+data.idx);
                return false;
            }
            try {
                await playerSchema.inventory.manager.items[data.idx].use(playerSchema);
            } catch(error) {
                Logger.error('Use item error.', playerSchema.player_id, data.idx, error.message);
                return false;
            }
        }
        if(InventoryConst.ACTIONS.EQUIP === data.act){
            return await this.queueEquipAction(playerSchema, data);
        }
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} data
     * @returns {Promise<boolean>}
     */
    async queueEquipAction(playerSchema, data)
    {
        return await this.equipLock.queue(playerSchema.player_id, async () => {
            try {
                return await this.executeEquipAction(playerSchema, data);
            } catch(error) {
                Logger.error('Equip item error.', playerSchema.player_id, data.idx, error.message);
                return false;
            }
        });
    }

    /**
     * @param {string} act
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRefusedForInactivePlayer(act, playerSchema)
    {
        return -1 !== [
            InventoryConst.ACTIONS.USE,
            InventoryConst.ACTIONS.EQUIP,
            InventoryConst.ACTIONS.TRADE_START,
            InventoryConst.ACTIONS.TRADE_ACCEPTED
        ].indexOf(act) && (playerSchema.isDeath() || playerSchema.isDisabled());
    }

    /**
     * @param {string} act
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRefusedWhileTrading(act, playerSchema)
    {
        return -1 !== [InventoryConst.ACTIONS.USE, InventoryConst.ACTIONS.EQUIP].indexOf(act)
            && true === playerSchema.inventory?.manager?.locked;
    }

    /**
     * @param {Client} client
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    closeTradeAction(client, data, room, playerSchema)
    {
        let ownerA = playerSchema.tradeInProgress?.inventories['A']?.owner.sessionId;
        let ownerB = playerSchema.tradeInProgress?.inventories['B']?.owner.sessionId;
        this.sendCloseUIMessage(playerSchema, ownerA, ownerB, room);
        playerSchema.tradeInProgress?.cancelExchange();
        playerSchema.tradeInvitedSessionId = false;
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @param {string} ownerA
     * @param {string} ownerB
     * @param {Object} room
     */
    sendCloseUIMessage(playerSchema, ownerA, ownerB, room)
    {
        let closeOnSessionId = playerSchema.sessionId === ownerA ? ownerB : ownerA;
        if(!closeOnSessionId){
            return;
        }
        let closeOnClient = this.fetchClientBySessionId(room, closeOnSessionId);
        if(!closeOnClient){
            return;
        }
        closeOnClient?.send('*', {act: GameConst.CLOSE_UI_ACTION, id: 'trade' + playerSchema.sessionId});
    }

    /**
     * @param {Object} room
     * @param {string} sessionId
     * @returns {Client|undefined}
     */
    fetchClientBySessionId(room, sessionId)
    {
        return room.activePlayerBySessionId(sessionId, room.roomId)?.client;
    }

    /**
     * @param {Client} client
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    tryExchangeStart(client, data, room, playerSchema)
    {
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to trade with himself.', playerSchema.sessionId, data);
            return false;
        }
        if(Processor.isNewExchangeRefused(
            [playerSchema, room.playerBySessionIdFromState(data.id)],
            this.newExchangeCancelsActive
        )){
            return false;
        }
        if(playerSchema.tradeInProgress){
            playerSchema.tradeInProgress.cancelExchange();
        }
        playerSchema.tradeInProgress = new ExchangePlatform({
            events: room.events,
            exchangeInitializerId: playerSchema.sessionId
        });
        let toPlayerClient = this.fetchClientBySessionId(room, data.id);
        if(!toPlayerClient){
            Logger.error('Player client not found.', toPlayerClient, data);
            return false;
        }
        let sendData = {
            act: InventoryConst.ACTIONS.TRADE_START,
            listener: 'trade',
            from: playerSchema.playerName,
            id: playerSchema.sessionId,
        };
        let awaitTrade = room.config.get('client/trade/players/awaitTimeOut', true);
        if(awaitTrade){
            let invitedExchange = playerSchema.tradeInProgress;
            setTimeout(() => {
                if(
                    invitedExchange !== playerSchema.tradeInProgress
                    || (invitedExchange.inventories?.A && invitedExchange.inventories?.B)
                ){
                    return true;
                }
                invitedExchange.cancelExchange();
                playerSchema.tradeInvitedSessionId = false;
                return false;
            }, room.config.get('client/trade/players/timeOut', 5000));
        }
        playerSchema.tradeInvitedSessionId = data.id;
        toPlayerClient.send('*', sendData);
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isMyTrade(playerSchema)
    {
        return playerSchema.tradeInProgress.exchangeInitializerId === playerSchema.sessionId;
    }

    /**
     * @param {Client} client
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean>}
     */
    async startExchange(client, data, room, playerSchema)
    {
        let exchangeStarterClient = this.fetchExchangeStarterClient(room, data);
        if(!exchangeStarterClient){
            Logger.warning('Missing starter client to start exchange. Session ID: '+data.id);
            return false;
        }
        let exchangeStarterPlayer = room.playerBySessionIdFromState(data.id);
        if(!exchangeStarterPlayer){
            Logger.warning(
                'Start exchange error, starter player is not in the room anymore. Session ID: '+data.id,
                exchangeStarterPlayer
            );
            return false;
        }
        if(playerSchema.sessionId !== exchangeStarterPlayer.tradeInvitedSessionId){
            Logger.warning('Start exchange error, player was not invited. Session ID: '+playerSchema.sessionId);
            return false;
        }
        exchangeStarterPlayer.tradeInvitedSessionId = false;
        let invitedExchange = exchangeStarterPlayer.tradeInProgress;
        let exchangePlayers = [exchangeStarterPlayer, playerSchema];
        if(Processor.isNewExchangeRefused(exchangePlayers, this.newExchangeCancelsActive)){
            if(!invitedExchange?.inventories?.B){
                invitedExchange?.cancelExchange();
            }
            return false;
        }
        await Processor.cancelActiveExchanges(room, exchangePlayers, this.newExchangeCancelsActive);
        if(invitedExchange !== exchangeStarterPlayer.tradeInProgress){
            Logger.info('Start exchange cancelled, the starter started another exchange. Session ID: '+data.id);
            return false;
        }
        if(playerSchema.tradeInProgress !== invitedExchange){
            playerSchema.tradeInProgress?.cancelExchange();
        }
        playerSchema.tradeInvitedSessionId = false;
        invitedExchange.exchangeInitializerId = exchangeStarterPlayer.sessionId;
        invitedExchange.initializeExchangeBetween({
            inventoryA: exchangeStarterPlayer.inventory.manager,
            inventoryB: playerSchema.inventory.manager
        });
        // both players will use the same exchange platform instance, if one cancel the request the other will get it:
        playerSchema.tradeInProgress = invitedExchange;
        // both players require the data:
        ExchangeUpdateSender.send(exchangeStarterPlayer, playerSchema, exchangeStarterClient);
        ExchangeUpdateSender.send(playerSchema, exchangeStarterPlayer, client);
        return true;
    }

    /**
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    declineExchange(data, room, playerSchema)
    {
        let exchangeStarterPlayer = room.playerBySessionIdFromState(data.id);
        if(!exchangeStarterPlayer || playerSchema.sessionId !== exchangeStarterPlayer.tradeInvitedSessionId){
            return false;
        }
        exchangeStarterPlayer.tradeInvitedSessionId = false;
        exchangeStarterPlayer.tradeInProgress?.cancelExchange();
        return true;
    }

    /**
     * @param {Client} client
     * @param {Object} data
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean>}
     */
    async runTradeAction(client, data, room, playerSchema)
    {
        let subActionParam = sc.get(data, ObjectsConst.TRADE_ACTIONS.SUB_ACTION, false);
        let subActionCallback = this.mapSubAction(subActionParam);
        if(!subActionCallback){
            Logger.critical('Missing mapped sub-action: "'+(subActionParam || 'false')+'".');
            return false;
        }
        if(!playerSchema.tradeInProgress?.inventories?.A){
            Logger.warning('Run trade error, no trade in progress. Session ID: '+playerSchema.sessionId);
            return false;
        }
        let exchangeStarterClient = this.fetchExchangeStarterClient(room, data);
        let exchangeStarterPlayer = room.playerBySessionIdFromState(data.id);
        if(!exchangeStarterClient || !exchangeStarterPlayer){
            Logger.error('Run trade error, the trade partner is not in the room anymore, trade cancelled.', data.id);
            playerSchema.tradeInProgress.cancelExchange();
            return false;
        }
        if(
            playerSchema.sessionId === exchangeStarterPlayer.sessionId
            || exchangeStarterPlayer.tradeInProgress !== playerSchema.tradeInProgress
        ){
            Logger.warning('Run trade refused, the given player is not the trade partner.', data.id);
            return false;
        }
        let inventoryKey = this.isMyTrade(playerSchema) ? 'A' : 'B';
        let subActionResult = await subActionCallback({
            transaction: playerSchema.tradeInProgress,
            data,
            inventoryKey
        });
        if(false === subActionResult && ObjectsConst.TRADE_ACTIONS.CONFIRM !== subActionParam){
            Logger.error('Exchange sub-action error.', playerSchema.tradeInProgress.lastError.message);
            return false;
        }
        let isTradeEnd = true === subActionResult && ObjectsConst.TRADE_ACTIONS.CONFIRM === subActionParam;
        ExchangeUpdateSender.send(exchangeStarterPlayer, playerSchema, exchangeStarterClient, isTradeEnd);
        ExchangeUpdateSender.send(playerSchema, exchangeStarterPlayer, client, isTradeEnd);
        return true;
    }

    /**
     * @param {Object} room
     * @param {Object} data
     * @returns {Client|undefined}
     */
    fetchExchangeStarterClient(room, data)
    {
        return room.activePlayerBySessionId(data.id, room.roomId)?.client;
    }

    /**
     * @param {string|boolean} subAction
     * @returns {function(Object): Promise<boolean>|boolean}
     */
    mapSubAction(subAction)
    {
        if(false === subAction || '' === subAction){
            return false;
        }
        let map = {};
        map[ObjectsConst.TRADE_ACTIONS.ADD] = (props) => Processor.add(props);
        map[ObjectsConst.TRADE_ACTIONS.REMOVE] = (props) => Processor.remove(props);
        map[ObjectsConst.TRADE_ACTIONS.CONFIRM] = (props) => Processor.updatePlayerConfirmation(props, true);
        map[ObjectsConst.TRADE_ACTIONS.DISCONFIRM] = (props) => Processor.updatePlayerConfirmation(props, false);
        return sc.get(map, subAction, false);
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} data
     * @returns {Promise<boolean>}
     */
    async executeEquipAction(playerSchema, data)
    {
        if(!sc.hasOwn(playerSchema.inventory.manager.items, data.idx)){
            Logger.info('Cannot equip item, key not found: '+data.idx);
            return false;
        }
        let item = playerSchema.inventory.manager.items[data.idx];
        if(!sc.isFunction(item.equip)){
            Logger.info('Cannot equip item, the item is not an equipment: '+data.idx);
            return false;
        }
        return await playerSchema.inventory.manager.toggleEquip(item);
    }

}

module.exports.InventoryMessageActions = InventoryMessageActions;
