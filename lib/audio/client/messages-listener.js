/**
 *
 * Reldens - MessagesListener.
 *
 * Manages audio-related messages from the server and queues them until the scene is ready.
 *
 */

const { AudioConst } = require('../constants');

/**
 * @typedef {import('colyseus.js').Room} ColyseusRoom
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class MessagesListener
{

    constructor()
    {
        /** @type {Array<Object>} */
        this.queueMessages = [];
        /** @type {boolean} */
        this.sceneReady = false;
    }

    /**
     * @param {ColyseusRoom} room
     * @param {GameManager} gameManager
     */
    listenMessages(room, gameManager)
    {
        room.onMessage('*', async (message) => {
            await this.processMessage(message, room, gameManager);
        });
    }

    /**
     * @returns {Promise<boolean>}
     */
    async processQueue()
    {
        this.sceneReady = true;
        if(0 === this.queueMessages.length){
            return false;
        }
        let messagesToProcess = [...this.queueMessages];
        this.queueMessages = [];
        for(let messageData of messagesToProcess){
            let { message, room, gameManager } = messageData;
            await this.processMessage(message, room, gameManager);
        }
        return true;
    }

    /**
     * @param {Object} message
     * @param {ColyseusRoom} room
     * @param {GameManager} gameManager
     * @returns {Promise<void>}
     */
    async processMessage(message, room, gameManager)
    {
        if(false === this.sceneReady){
            this.queueMessages.push({message, room, gameManager});
            return;
        }
        if(message.act === AudioConst.AUDIO_UPDATE){
            await gameManager.audioManager.processUpdateData(message, room, gameManager);
        }
        if(message.act === AudioConst.AUDIO_DELETE){
            await gameManager.audioManager.processDeleteData(message, room, gameManager);
        }
    }

}

module.exports.MessagesListener = MessagesListener;
