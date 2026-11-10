/**
 *
 * Reldens - GameRoomLeaveHandler
 *
 * Handles the close of the lobby (game room) connection. The server closes the lobby of a tab as consented when the
 * same account logs in somewhere else, so that close shows the session ended reload message, also on the player
 * selection and creation screens that have no scene yet. A tab already showing the game over message (a tab in a
 * scene gets it when its player is removed) is left as it is, and any other close is left to the scene room handling.
 *
 */

const { SyncClientDriver } = require('../../../sync/client/colyseus/sync-client-driver');

class GameRoomLeaveHandler
{

    /**
     * @param {GameManager} gameManager
     */
    constructor(gameManager)
    {
        /** @type {GameManager} */
        this.gameManager = gameManager;
    }

    /**
     * @param {number} code
     * @returns {boolean}
     */
    endSession(code)
    {
        if(SyncClientDriver.CloseCode.CONSENTED !== code || this.gameManager.gameOver){
            return false;
        }
        this.gameManager.gameOver = true;
        this.gameManager.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.sessionEnded'));
        return true;
    }

}

module.exports.GameRoomLeaveHandler = GameRoomLeaveHandler;
