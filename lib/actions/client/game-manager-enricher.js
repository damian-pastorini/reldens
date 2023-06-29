/**
 *
 * Reldens - GameManagerEnricher
 *
 */

const { ReceiverWrapper } = require('./receiver-wrapper');

class GameManagerEnricher
{
    
    static withReceiver(player, roomEvents, gameManager)
    {
        if(player.playerId !== roomEvents.room.sessionId){
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
    }

}

module.exports.GameManagerEnricher = GameManagerEnricher;
