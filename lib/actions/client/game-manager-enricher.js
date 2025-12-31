/**
 *
 * Reldens - GameManagerEnricher
 *
 * Enriches the GameManager with a ReceiverWrapper instance for skill message processing.
 *
 */

const { ReceiverWrapper } = require('./receiver-wrapper');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../users/client/player-engine').PlayerEngine} PlayerEngine
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager - CUSTOM DYNAMIC
 * @typedef {import('../../game/client/room-events').RoomEvents} RoomEvents
 */
class GameManagerEnricher
{

    /**
     * @param {PlayerEngine} player
     * @param {RoomEvents} roomEvents
     * @param {GameManager} gameManager
     * @returns {boolean|void}
     */
    static withReceiver(player, roomEvents, gameManager)
    {
        if(!player || !roomEvents || !gameManager){
            Logger.error('Invalid input parameters for GameManagerEnricher.withReceiver method.');
            return false;
        }
        if(player?.playerId !== roomEvents?.room.sessionId){
            return false;
        }
        if(!gameManager.skills){
            gameManager.skills = new ReceiverWrapper({owner: player, roomEvents, events: gameManager.events});
        }
        if(!gameManager.skillsQueue?.length){
            return false;
        }
        for(let message of gameManager.skillsQueue){
            gameManager.skills.processMessage(message);
        }
        gameManager.skillsQueue = [];
    }

}

module.exports.GameManagerEnricher = GameManagerEnricher;
