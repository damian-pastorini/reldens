/**
 *
 * Reldens - Audio Client Package.
 *
 */

const { EventsManagerSingleton } = require('@reldens/utils');
const { AudioManager } = require('./manager');
const { AudioUi } = require('./audio-ui');
const { AudioConst } = require('../constants');

class AudioPack
{

    constructor()
    {
        this.defaultAudioConfig = {
            mute: false,
            volume: 1,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: true,
            delay: 0
        };
        EventsManagerSingleton.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            gameManager.audioManager = new AudioManager();
        });
        EventsManagerSingleton.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room, gameManager);
        });
        EventsManagerSingleton.on('reldens.preloadUiScene', (preloadScene) => {
            preloadScene.load.html('audio', 'assets/html/ui-audio.html');
            preloadScene.load.html('audio-category', 'assets/html/ui-audio-category-row.html');
        });
        EventsManagerSingleton.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new AudioUi(preloadScene);
            this.uiManager.createUi();
        });
    }

    listenMessages(room, gameManager)
    {
        room.onMessage((message) => {
            if(message.act !== AudioConst.AUDIO_UPDATE){
                return;
            }
            if(message.categories){
                gameManager.audioManager.categories = message.categories;
            }
            let currentScene = gameManager.gameEngine.scene.getScene(room.name);
            for(let audio of message.audios){
                let filesName = audio.files_name.split(',');
                let filesArr = [];
                for(let fileName of filesName){
                    filesArr.push('assets/audio/'+fileName);
                }
                currentScene.load.audio(audio.audio_key, filesArr);
            }
            currentScene.load.start();
            currentScene.load.on('complete', () => {
                let generatedAudios = {};
                for(let audio of message.audios){
                    let soundConfig = Object.assign({}, this.defaultAudioConfig, (audio.config || {}));
                    let soundInstance = currentScene.sound.add(audio.audio_key, soundConfig);
                    if(audio.markers.length){
                        for(let marker of audio.markers){
                            let markerConfig = Object.assign({}, soundConfig, (marker.config || {}), {
                                name: marker.marker_key,
                                start: marker.start,
                                duration: marker.duration,
                            });
                            soundInstance.addMarker(markerConfig);
                        }
                    }
                    generatedAudios[audio.audio_key] = {data: audio, soundInstance};
                }
                gameManager.audioManager.roomAudios = generatedAudios;
            });
        });
    }

}

module.exports.AudioPack = AudioPack;
