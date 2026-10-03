/**
 *
 * Reldens - RoomsMessageListener
 *
 * Listens for rooms-related server messages on the scene room. When the current room is closing because it was
 * deleted, it marks the disconnection as forced and reloads the client back to the login when the close time ends.
 *
 */

const { RoomsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class RoomsMessageListener
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data on RoomsMessageListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on RoomsMessageListener.', props);
            return false;
        }
        if(RoomsConst.ROOM_CLOSING !== message.act){
            return false;
        }
        let gameManager = roomEvents.gameManager;
        gameManager.forcedDisconnection = true;
        setTimeout(
            () => {
                gameManager.gameDom.alertReload(gameManager.services.translator.t('game.errors.roomClosed'));
            },
            1000 * Number(sc.get(message, 'seconds', 0))
        );
        return true;
    }

}

module.exports.RoomsMessageListener = RoomsMessageListener;
