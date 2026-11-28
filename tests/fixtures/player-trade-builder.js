/**
 *
 * Reldens - PlayerTradeBuilder
 *
 * Builds the player trade fixtures of the inventory message actions tests: a trade room that finds the given starter
 * player and the clients (recording their sent messages) and records its emitted events, a trade player with
 * its inventory manager lock (with no trade in progress property when it has no trade, like a player schema before its
 * first trade), and a pending trade (exchange platform) that records its initialize and cancel calls.
 *
 */

class PlayerTradeBuilder
{

    /**
     * @param {Object|boolean} starterPlayer
     * @param {Array<Object>} sentMessages
     * @param {Array<Object>} [emittedEvents]
     * @returns {Object}
     */
    createTradeRoom(starterPlayer, sentMessages, emittedEvents = [])
    {
        return {
            roomId: 'room-1',
            config: {get: (path, defaultValue) => defaultValue},
            events: {emit: async (eventKey, eventData) => emittedEvents.push({eventKey, eventData})},
            activePlayerBySessionId: () => ({client: {send: (type, message) => sentMessages.push(message)}}),
            playerBySessionIdFromState: () => starterPlayer
        };
    }

    /**
     * @param {string} sessionId
     * @param {Object|boolean} tradeInProgress
     * @param {boolean} [isLocked]
     * @returns {Object}
     */
    createTradePlayer(sessionId, tradeInProgress, isLocked = false)
    {
        let tradePlayer = {
            sessionId,
            playerName: 'player-'+sessionId,
            inventory: {
                manager: {items: {}, locked: isLocked},
                client: {extractItemsDataForSend: () => ({})}
            }
        };
        if(tradeInProgress){
            tradePlayer.tradeInProgress = tradeInProgress;
        }
        return tradePlayer;
    }

    /**
     * @param {Array<Object>} initializedExchanges
     * @param {Array<boolean>} [cancelledExchanges]
     * @returns {Object}
     */
    createTradeInProgress(initializedExchanges, cancelledExchanges = [])
    {
        let tradeInProgress = {
            confirmations: {A: false, B: false},
            exchangeBetween: {A: {}, B: {}},
            inventories: {}
        };
        tradeInProgress.initializeExchangeBetween = (props) => {
            initializedExchanges.push(props);
            tradeInProgress.inventories = {A: {owner: {sessionId: 'session1'}}, B: {owner: {sessionId: 'session2'}}};
        };
        tradeInProgress.cancelExchange = () => cancelledExchanges.push(true);
        return tradeInProgress;
    }

}

module.exports.PlayerTradeBuilder = PlayerTradeBuilder;
