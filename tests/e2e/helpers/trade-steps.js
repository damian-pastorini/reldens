/**
 *
 * Reldens - Trade Steps
 *
 * The steps of the trading specs: the inventory rows of the group players preserved and the extra items seeded before
 * they log in (TeamSteps, each player with its page, name, player id and session id and its room messages recorded);
 * the trade messages a client sends (the start, the answer, the add, remove, confirm and disconfirm actions and the
 * close of the trade box), a trade opened and an offer confirmed by both players; an item action (use, equip or trash)
 * sent for the item of a key; the trade messages a client received; and the live trade state and items of a player
 * (TradesProbe) with the total quantity of an item key, live and stored.
 *
 */

const { expect } = require('@playwright/test');
const { TeamSteps } = require('./team-steps');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { ParallelSpecGroups } = require('./parallel-spec-groups');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { InventoryConst } = require('../../../lib/inventory/constants');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { GameConst } = require('../../../lib/game/constants');

class TradeSteps
{

    static ACCEPT = '1';
    static TIME_OUT_PATH = 'client/trade/players/timeOut';
    static AWAIT_TIME_OUT_PATH = 'client/trade/players/awaitTimeOut';
    static SETTLE_MS = 1500;

    static async enterPlayers(context, playersCount = 2, seededItems = [], configValues = {})
    {
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
        let playersNames = TeamSteps.USER_SUFFIXES.slice(0, playersCount).map(
            suffix => context.gameConfig['e2ePlayerName'+suffix]
        );
        for(let playerName of playersNames){
            await E2eSeedAndRestoreApi.preserveRows(context.gameConfig, context.e2eGroup, 'itemsInventory', {
                owner_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: playerName})
            });
        }
        for(let seededItem of seededItems){
            await E2eSeedAndRestoreApi.seedInventoryItem(
                context.gameConfig,
                context.e2eGroup,
                playersNames[seededItem.playerIndex],
                seededItem.itemKey,
                seededItem.qty
            );
        }
        return await TeamSteps.enterPlayers(context, playersCount);
    }

    static async start(fromPlayer, toPlayer)
    {
        await RoomMessagesRecorder.sendMessage(fromPlayer.page, {act: InventoryConst.ACTIONS.TRADE_START, id: toPlayer.sessionId});
    }

    static async answer(answeringPlayer, inviterPlayer, value = TradeSteps.ACCEPT)
    {
        await RoomMessagesRecorder.sendMessage(
            answeringPlayer.page,
            {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, id: inviterPlayer.sessionId, value}
        );
    }

    static async open(starterPlayer, partnerPlayer)
    {
        await TradeSteps.start(starterPlayer, partnerPlayer);
        await TradeSteps.waitForMessages(partnerPlayer, InventoryConst.ACTIONS.TRADE_START, 1);
        await TradeSteps.answer(partnerPlayer, starterPlayer);
        await TradeSteps.waitForMessages(starterPlayer, InventoryConst.ACTIONS.TRADE_SHOW, 1);
        await TradeSteps.waitForMessages(partnerPlayer, InventoryConst.ACTIONS.TRADE_SHOW, 1);
    }

    static async sendAction(player, partnerPlayer, sub, actionData = {})
    {
        await RoomMessagesRecorder.sendMessage(player.page, Object.assign(
            {act: InventoryConst.ACTIONS.TRADE_ACTION, id: partnerPlayer.sessionId, [ObjectsConst.TRADE_ACTIONS.SUB_ACTION]: sub},
            actionData
        ));
    }

    static async offer(player, partnerPlayer, itemId, qty)
    {
        await TradeSteps.sendAction(player, partnerPlayer, ObjectsConst.TRADE_ACTIONS.ADD, {itemId, qty});
    }

    static async confirm(player, partnerPlayer)
    {
        await TradeSteps.sendAction(player, partnerPlayer, ObjectsConst.TRADE_ACTIONS.CONFIRM);
    }

    static async close(player, partnerPlayer)
    {
        await RoomMessagesRecorder.sendMessage(player.page, {act: GameConst.CLOSE_UI_ACTION, id: 'trade'+partnerPlayer.sessionId});
    }

    static async offerAndConfirm(context, starterPlayer, partnerPlayer, itemId, qty)
    {
        await TradeSteps.offer(starterPlayer, partnerPlayer, itemId, qty);
        await TradeSteps.expectOffered(context, starterPlayer, {[itemId]: qty}, 'The item is offered');
        await TradeSteps.confirm(starterPlayer, partnerPlayer);
        await TradeSteps.expectConfirmed(context, starterPlayer, true, 'The starter confirms');
    }

    static async waitForMessages(player, act, count)
    {
        await expect.poll(
            async () => (await RoomMessagesRecorder.fetchMessages(player.page, act)).length,
            {message: 'The '+act+' messages arrive to '+player.playerName, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThanOrEqual(count);
    }

    static async fetchState(context, player)
    {
        let roomName = ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName;
        let state = await SecurityApi.request(
            context.gameConfig,
            'GET',
            '/api/e2e/trades/state?roomName='+encodeURIComponent(roomName)+'&playerName='+encodeURIComponent(player.playerName)
        );
        expect(state.items, 'The trade state of '+player.playerName+' must be read: '+state.error).toBeTruthy();
        return state;
    }

    static async fetchItemId(context, player, itemKey)
    {
        let items = (await TradeSteps.fetchState(context, player)).items;
        return Object.keys(items).find(inventoryId => itemKey === items[inventoryId].key);
    }

    static async sendItemAction(context, player, act, itemKey)
    {
        let itemId = await TradeSteps.fetchItemId(context, player, itemKey);
        await RoomMessagesRecorder.sendMessage(player.page, {act, 'idx': itemId});
        return itemId;
    }

    static async fetchQuantity(context, player, itemKey)
    {
        let items = (await TradeSteps.fetchState(context, player)).items;
        return Object.keys(items).filter(inventoryId => itemKey === items[inventoryId].key).reduce(
            (totalQuantity, inventoryId) => totalQuantity + Number(items[inventoryId].qty),
            0
        );
    }

    static async expectQuantity(context, player, itemKey, expectedQuantity, message)
    {
        await expect.poll(
            async () => await TradeSteps.fetchQuantity(context, player, itemKey),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expectedQuantity);
    }

    static async expectStoredQuantity(context, player, itemKey, expectedQuantity, message)
    {
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, player.playerName, itemKey),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expectedQuantity);
    }

    static async fetchOffer(context, player)
    {
        let trade = (await TradeSteps.fetchState(context, player)).trade;
        return trade ? trade.exchangeBetween[TradeSteps.fetchOwnKey(trade, player)] : false;
    }

    static async expectOffered(context, player, expectedOffer, message)
    {
        await expect.poll(
            async () => await TradeSteps.fetchOffer(context, player),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expectedOffer);
    }

    static async expectConfirmed(context, player, isConfirmed, message)
    {
        await expect.poll(async () => {
            let trade = (await TradeSteps.fetchState(context, player)).trade;
            return trade ? trade.confirmations[TradeSteps.fetchOwnKey(trade, player)] : false;
        }, {message, timeout: TimeConstants.SERVER_RESPONSE}).toBe(isConfirmed);
    }

    static async expectTradeOpen(context, player, isOpen, message)
    {
        await expect.poll(
            async () => Boolean((await TradeSteps.fetchState(context, player)).trade?.isOpen),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(isOpen);
    }

    static async expectNoTradeShow(players, message)
    {
        await players[0].page.waitForTimeout(TradeSteps.SETTLE_MS);
        for(let player of players){
            expect(
                await RoomMessagesRecorder.fetchMessages(player.page, InventoryConst.ACTIONS.TRADE_SHOW),
                message+': '+player.playerName
            ).toEqual([]);
        }
    }

    static async expectLocked(context, player, isLocked, message)
    {
        await expect.poll(
            async () => (await TradeSteps.fetchState(context, player)).locked,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(isLocked);
    }

    static fetchOwnKey(trade, player)
    {
        return player.sessionId === trade.ownersIds.B ? 'B' : 'A';
    }

}

module.exports.TradeSteps = TradeSteps;
