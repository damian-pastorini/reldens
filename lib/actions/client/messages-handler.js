/**
 *
 * Reldens - MessagesHandler
 *
 *
 * Main functionalities:
 * The MessagesHandler class is responsible for processing or queuing messages received by the gameManager.
 * It validates the message using the MessagesGuard class and checks if there is an active scene and player. If there
 * is an active scene and player, it processes the message using the skills.processMessage() method. Otherwise, it
 * queues the message in the skillsQueue field of the gameManager.
 *
 * Methods:
 * - processOrQueueMessage(message, gameManager): This method processes or queues the message received by the
 * gameManager. It validates the message using the MessagesGuard class and checks if there is an active scene and
 * player. If there is an active scene and player, it processes the message using the skills.processMessage() method.
 * Otherwise, it queues the message in the skillsQueue field of the gameManager.
 *
 */

const { MessagesGuard } = require('./messages-guard');
const { sc } = require('@reldens/utils');

class MessagesHandler
{

    static processOrQueueMessage(message, gameManager)
    {
        if(!MessagesGuard.validate(message)){
            return false;
        }
        let currentScene = gameManager.getActiveScene();
        if(currentScene && currentScene.player){
            return gameManager.skills.processMessage(message);
        }
        if(!sc.hasOwn(gameManager, 'skillsQueue')){
            gameManager.skillsQueue = [];
        }
        gameManager.skillsQueue.push(message);
    }

}

module.exports.MessagesHandler = MessagesHandler;
