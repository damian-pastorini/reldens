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
    }

    listenMessages(room, gameManager)
    {
        room.onMessage(async (message) => {
            if(message.act === AudioConst.AUDIO_UPDATE){
                await gameManager.audioManager.processUpdateData(message, room, gameManager);
            }
            if(message.act === AudioConst.AUDIO_DELETE){
                await gameManager.audioManager.processDeleteData(message, room, gameManager);
            }
        });
    }

}

module.exports.MessagesListener = MessagesListener;
