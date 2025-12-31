/**
 *
 * Reldens - MessagesHandler
 *
 * Processes or queues action messages based on the current game state.
 *
 */

const { MessagesGuard } = require('./messages-guard');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 *
 * @typedef {Object} ActionMessage
 * @property {string} act
 */
class MessagesHandler
{

    /**
     * @param {ActionMessage} message
     * @param {GameManager} gameManager
     * @returns {boolean|void}
     */
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
