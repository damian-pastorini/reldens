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
        room.onMessage((message) => {
            if(message.act !== AudioConst.AUDIO_UPDATE){
                return;
            }
            if(message.categories){
                gameManager.audioManager.addCategories(message.categories);
                gameManager.events.emit('reldens.audioManagerUpdateCategoriesLoaded', this, room, gameManager, message);
            }
            if(message.audios){
                let currentScene = gameManager.gameEngine.scene.getScene(room.name);
                gameManager.audioManager.loadAudiosInScene(
                    message.audios,
                    currentScene
                );
                gameManager.events.emit('reldens.audioManagerUpdateAudiosLoaded', this, room, gameManager, message);
            }
        });
    }

}

module.exports.MessagesListener = MessagesListener;
