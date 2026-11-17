/**
 *
 * Reldens - AudioClientBuilder
 *
 * Builds the client audio stubs from the sample audio rows: the music and sound categories, the town music and the
 * footstep audio with its animation markers, the recording audio instances (played keys, stops, mute and markers), the
 * Phaser scene with its audio cache, sound manager and audio loader (recording the loads and their file complete
 * callbacks), and a real client AudioManager with the sample categories added as the update message adds them.
 *
 */

const { AudioManager } = require('../../lib/audio/client/manager');

class AudioClientBuilder
{

    constructor()
    {
        /** @type {Object} */
        this.musicCategory = {id: 1, category_key: 'music', category_label: 'Music', enabled: 1, single_audio: 1};
        /** @type {Object} */
        this.soundCategory = {id: 3, category_key: 'sound', category_label: 'Sound', enabled: 1, single_audio: 0};
        /** @type {string} */
        this.townSceneKey = 'reldens-new-age-town';
        /** @type {number} */
        this.currentPlayerId = 7;
    }

    /**
     * @param {string} audioKey
     * @returns {Object}
     */
    createAudioInstance(audioKey)
    {
        let audioInstance = {key: audioKey, currentConfig: {}, mute: true, isPlaying: false, played: [], stops: 0, markers: {}};
        audioInstance.play = (marker) => audioInstance.played.push(marker || audioKey) && Object.assign(audioInstance, {isPlaying: true});
        audioInstance.stop = () => Object.assign(audioInstance, {stops: audioInstance.stops + 1, isPlaying: false});
        audioInstance.addMarker = (markerConfig) => Object.assign(audioInstance.markers, {[markerConfig.name]: markerConfig});
        return audioInstance;
    }

    /**
     * @param {string} audioKey
     * @param {Object} category
     * @param {Object} config
     * @param {Array<string>} markers
     * @returns {Object}
     */
    createLoadedAudio(audioKey, category, config, markers)
    {
        let audioInstance = this.createAudioInstance(audioKey);
        for(let marker of markers){
            audioInstance.addMarker({name: marker});
        }
        return {data: {audio_key: audioKey, config, related_audio_categories: category}, audioInstance};
    }

    /**
     * @param {string} sceneKey
     * @returns {Object}
     */
    createScene(sceneKey)
    {
        let scene = {key: sceneKey, loaders: [], removedKeys: [], emittedEvents: [], cache: {audio: {entries: {entries: {}}}}};
        scene.sound = {
            add: (audioKey) => this.createAudioInstance(audioKey),
            removeByKey: (audioKey) => scene.removedKeys.push(audioKey)
        };
        scene.load = {audio: (audioKey, files) => this.createLoader(scene, audioKey, files)};
        scene.gameManager = {events: {emit: async (eventName) => scene.emittedEvents.push(eventName)}};
        return scene;
    }

    /**
     * @param {Object} scene
     * @param {string} audioKey
     * @param {Array<string>} files
     * @returns {Object}
     */
    createLoader(scene, audioKey, files)
    {
        let loader = {audioKey, files, callbacks: {}, started: false};
        loader.on = (eventName, callback) => Object.assign(loader.callbacks, {[eventName]: callback});
        loader.start = () => Object.assign(loader, {started: true});
        scene.loaders.push(loader);
        return loader;
    }

    /**
     * @param {Object} scene
     * @param {Object} loader
     * @returns {Promise<*>}
     */
    async completeLoad(scene, loader)
    {
        scene.cache.audio.entries.entries[loader.audioKey] = true;
        return await loader.callbacks.filecomplete(loader.audioKey);
    }

    /**
     * @param {Object<string, number>} playerConfig
     * @returns {AudioManager}
     */
    createAudioManager(playerConfig)
    {
        let audioManager = new AudioManager({
            events: {emit: async () => true},
            playerConfig,
            currentPlayerData: {id: this.currentPlayerId}
        });
        audioManager.addCategories([this.musicCategory, this.soundCategory]);
        return audioManager;
    }

}

module.exports.AudioClientBuilder = AudioClientBuilder;
