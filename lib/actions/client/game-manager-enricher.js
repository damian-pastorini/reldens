/**
 *
 * Reldens - GameManagerEnricher
 *
 * Main functionalities:
 * The GameManagerEnricher class is responsible for enriching the GameManager class with a ReceiverWrapper instance,
 * which is used to process messages related to skills. It checks if the player is the owner of the room and if the
 * gameManager has a skill instance. If so, it processes the messages in the skillsQueue.
 *
 * Methods:
 * - withReceiver(player, roomEvents, gameManager): static method that receives a player, roomEvents, and gameManager
 * instances. It checks if the player is the owner of the room and if the gameManager has a skill instance. If so, it
 * processes the messages in the skillsQueue.
 *
 */

const { ReceiverWrapper } = require('./receiver-wrapper');
const { Logger } = require('@reldens/utils');

class GameManagerEnricher
{

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
