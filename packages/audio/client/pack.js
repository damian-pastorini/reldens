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
        this.events = sc.get(props, 'events', false);
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
            this.initialAudiosData = sc.get(initialGameData, 'audio', {});
        });
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            let defaultAudioConfig = gameManager.config.get('client/general/audio/defaultAudioConfig', true);
            gameManager.audioManager.updateDefaultConfig(defaultAudioConfig);
            this.messagesListener.listenMessages(room, gameManager);
        });
        this.events.on('reldens.preloadUiScene', async (preloadScene) => {
            preloadScene.load.html('audio', 'assets/html/ui-audio.html');
            preloadScene.load.html('audio-category', 'assets/html/ui-audio-category-row.html');
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new AudioUi(preloadScene);
            this.uiManager.createUi();
        });
        this.events.on('reldens.afterSceneDynamicCreate', async (sceneDynamic) => {
            let audioManager = sceneDynamic.gameManager.audioManager;
            if(!audioManager){
                return false;
            }
            let globalAudios = sc.get(this.initialAudiosData, 'globalAudios', {});
            await audioManager.loadGlobalAudios(globalAudios, sceneDynamic);
            await this.messagesListener.processQueue();
            this.sceneAudioPlayer.associateSceneAnimationsAudios(audioManager, sceneDynamic);
            sceneDynamic.cameras.main.on('camerafadeincomplete', () => {
                this.sceneAudioPlayer.playSceneAudio(audioManager, sceneDynamic);
            });
        });
        this.events.on('reldens.changeSceneDestroyPrevious', (sceneDynamic) => {
            sceneDynamic.gameManager.audioManager.destroySceneAudios();
        });
        this.events.on('reldens.allAudiosLoaded', (audioManager, audios, currentScene) => {
            this.sceneAudioPlayer.playSceneAudio(audioManager, currentScene, true);
        });
    }

}

module.exports.AudioPack = AudioPack;
