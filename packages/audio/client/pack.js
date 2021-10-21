/**
 *
 * Reldens - Audio Client Package.
 *
 */

const { AudioManager } = require('./manager');
const { SceneAudioPlayer } = require('./scene-audio-player');
const { MessagesListener } = require('./messages-listener');
const { AudioUi } = require('./audio-ui');
const { PackInterface } = require('../../features/pack-interface');
const { Logger, sc } = require('@reldens/utils');

class AudioPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AudioPack.');
        }
        this.messagesListener = new MessagesListener();
        this.sceneAudioPlayer = SceneAudioPlayer;
        this.initialAudiosData = {};
        this.listenEvents();
    }

    listenEvents()
    {
        this.events.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            gameManager.audioManager = new AudioManager({events: this.events});
            this.initialAudiosData = sc.getDef(initialGameData, 'audio', {});
        });
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            let defaultAudioConfig = gameManager.config.get('client/general/audio/defaultAudioConfig', true);
            gameManager.audioManager.updateDefaultConfig(defaultAudioConfig);
            this.messagesListener.listenMessages(room, gameManager);
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            preloadScene.load.html('audio', 'assets/html/ui-audio.html');
            preloadScene.load.html('audio-category', 'assets/html/ui-audio-category-row.html');
            let globalAudiosData = sc.getDef(this.initialAudiosData, 'global', false);
            if(globalAudiosData){
                preloadScene.gameManager.audioManager.loadGlobalAudios(
                    preloadScene,
                    globalAudiosData
                );
            }
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new AudioUi(preloadScene);
            this.uiManager.createUi();
            let globalAudiosData = sc.getDef(this.initialAudiosData, 'global', false);
            if(globalAudiosData){
                let audioManager = preloadScene.gameManager.audioManager;
                audioManager['globalAudios'] = audioManager.generateAudios(
                    preloadScene,
                    globalAudiosData
                );
            }
        });
        this.events.on('reldens.afterSceneDynamicCreate', (sceneDynamic) => {
            let audioManager = sceneDynamic.gameManager.audioManager;
            if(!audioManager){
                return false;
            }
            this.sceneAudioPlayer.associateSceneAnimationsAudios(audioManager, sceneDynamic);
            sceneDynamic.cameras.main.on('camerafadeincomplete', () => {
                this.sceneAudioPlayer.playSceneAudio(audioManager, sceneDynamic);
            });
        });
        this.events.on('reldens.changeSceneDestroyPrevious', (sceneDynamic) => {
            let audioManager = sceneDynamic.gameManager.audioManager;
            let playingAudioCategories = audioManager.playing;
            if(!Object.keys(playingAudioCategories).length){
                return false;
            }
            for(let i of Object.keys(playingAudioCategories)){
                let playingAudioCategory = playingAudioCategories[i];
                let categoryData = audioManager.categories[i];
                if(categoryData.single_audio && typeof playingAudioCategory.stop === 'function'){
                    playingAudioCategory.stop();
                    delete playingAudioCategories[i];
                    continue;
                }
                if(!categoryData.single_audio && !Object.keys(playingAudioCategory).length){
                    continue;
                }
                for(let a of Object.keys(playingAudioCategory)){
                    let playingAudio = playingAudioCategory[a];
                    if(typeof playingAudio.stop === 'function'){
                        playingAudio.stop();
                        delete playingAudio[i];
                    }
                }
            }
            return true;
        });
        this.events.on('reldens.allAudiosLoaded', (audioManager, audios, currentScene) => {
            this.sceneAudioPlayer.playSceneAudio(audioManager, currentScene, true);
        });
    }

}

module.exports.AudioPack = AudioPack;
