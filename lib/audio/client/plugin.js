/**
 *
 * Reldens - Audio Client Plugin
 *
 * Initializes and manages the audio system on the client side.
 *
 */

const { AudioManager } = require('./manager');
const { SceneAudioPlayer } = require('./scene-audio-player');
const { MessagesListener } = require('./messages-listener');
const { AudioUi } = require('./audio-ui');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const Translations = require('./snippets/en_US');
const { PluginInterface } = require('../../features/plugin-interface');
const { AudioConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManagerSingleton} EventsManagerSingleton
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class AudioPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     * @param {EventsManagerSingleton} [props.events]
     * @param {GameManager} [props.gameManager]
     */
    setup(props)
    {
        /** @type {EventsManagerSingleton|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AudioPlugin.');
        }
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in AudioPlugin.');
        }
        this.setTranslations();
        /** @type {MessagesListener} */
        this.messagesListener = new MessagesListener();
        /** @type {typeof SceneAudioPlayer} */
        this.sceneAudioPlayer = SceneAudioPlayer;
        /** @type {Object} */
        this.initialAudiosData = {};
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, AudioConst.MESSAGE.DATA_VALUES);
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        // @TODO - BETA - Extract all listeners handlers in external services.
        if(!this.events){
            return false;
        }
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            this.initializeAudioManager(gameManager);
            this.messagesListener.listenMessages(room, gameManager);
        });
        this.events.on('reldens.preloadUiScene', async (preloadScene) => {
            preloadScene.load.html('audio', '/assets/html/ui-audio.html');
            preloadScene.load.html('audio-category', '/assets/html/ui-audio-category-row.html');
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new AudioUi(preloadScene);
            this.uiManager.createUi();
        });
        this.events.on('reldens.afterSceneDynamicCreate', async (sceneDynamic) => {
            let audioManager = sceneDynamic.gameManager.audioManager;
            if(!audioManager){
                Logger.warning('Audio manager undefined in AudioPlugin.');
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

    /**
     * @param {GameManager} gameManager
     */
    initializeAudioManager(gameManager)
    {
        if(gameManager.audioManager){
            return;
        }
        if(!gameManager.initialGameData.player){
            Logger.warning('Missing initialGameData.player', gameManager.initialGameData);
        }
        gameManager.audioManager = new AudioManager({
            events: this.events,
            currentPlayerData: gameManager.initialGameData.player
        });
        gameManager.audioManager.updateDefaultConfig(
            gameManager.config.getWithoutLogs('client/general/audio/defaultAudioConfig')
        );
        this.initialAudiosData = sc.get(gameManager.initialGameData, 'audio', {});
    }
}

module.exports.AudioPlugin = AudioPlugin;
