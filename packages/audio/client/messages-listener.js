/**
 *
 * Reldens - MessagesListener.
 *
 */

const { SceneAudioPlayer } = require('./scene-audio-player');
const { AudioConst } = require('../constants');

class MessagesListener
{

    constructor()
    {
        this.sceneAudioPlayer = SceneAudioPlayer;
        this.queueMessages = [];
        this.sceneReady = false;
    }

    listenMessages(room, gameManager)
    {
        room.onMessage(async (message) => {
            await this.processMessage(message, room, gameManager);
        });
    }

    async processQueue()
    {
        this.sceneReady = true;
        if(0 === this.queueMessages.length){
            return false;
        }
        for(let messageData of this.queueMessages){
            let { message, room, gameManager } = messageData;
            await this.processMessage(message, room, gameManager);
        }
        return true;
    }

    async processMessage(message, room, gameManager)
    {
        if(false === this.sceneReady){
            this.queueMessages.push({message, room, gameManager});
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
