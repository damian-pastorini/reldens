/**
 *
 * Reldens - Trades Probe
 *
 * Server side e2e endpoint for the trading specs: the live trade state of a player in its room, the inventory lock, the
 * inventory items (by the inventory id, with the key, the quantity and the equipped state), the session id of the
 * player it invited and its exchange platform (the initializer session id, whether both inventories are set, the owner
 * of each inventory, the confirmations and the offered quantities of each side).
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { Logger, sc } = require('@reldens/utils');

class TradesProbe
{

    static mapItems(manager)
    {
        let items = {};
        for(let inventoryId of Object.keys(manager.items)){
            let item = manager.items[inventoryId];
            items[inventoryId] = {key: item.key, qty: item.qty, equipped: Boolean(item.equipped)};
        }
        return items;
    }

    static mapTrade(trade)
    {
        if(!trade){
            return false;
        }
        return {
            initializerId: trade.exchangeInitializerId,
            isOpen: Boolean(trade.inventories?.A && trade.inventories?.B),
            ownersIds: {A: trade.inventories?.A?.owner?.sessionId || false, B: trade.inventories?.B?.owner?.sessionId || false},
            confirmations: trade.confirmations,
            exchangeBetween: trade.exchangeBetween
        };
    }

    static fetchTradeState(room, playerName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        let manager = playerSchema?.inventory?.manager;
        if(!manager){
            return {error: 'Inventory of '+playerName+' not found in room '+room.roomName+'.'};
        }
        return {
            locked: Boolean(manager.locked),
            items: TradesProbe.mapItems(manager),
            invitedSessionId: playerSchema.tradeInvitedSessionId || false,
            trade: TradesProbe.mapTrade(playerSchema.tradeInProgress)
        };
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.get('/api/e2e/trades/state', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => TradesProbe.fetchTradeState(room, sc.get(request.query, 'playerName', ''))
            );
        });
        Logger.info('[trades-probe] Trades endpoints registered.');
    }

}

module.exports.TradesProbe = TradesProbe;
