/**
 *
 * Reldens - MessagesHandler
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
