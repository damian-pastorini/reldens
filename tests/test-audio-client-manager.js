/**
 *
 * Reldens - Test Audio Client Manager
 *
 * Tests the client audio manager, messages listener and settings UI with the sample categories: a category checked
 * again plays its music and stores enabled 1, an unchecked multi track category stops every playing audio, a locked
 * mute state refuses a toggle, the ad end restores the muted categories, a missing audio file is skipped, the audio
 * update message, the room change stopping the previous audios, the messages
 * received before the scene is ready queued and applied, and the settings rows and their toggle.
 *
 */

const { BaseTest } = require('./base-test');
const { AudioClientBuilder } = require('./fixtures/audio-client-builder');
const { MessagesListener } = require('../lib/audio/client/messages-listener');
const { AudioUi } = require('../lib/audio/client/audio-ui');
const { AudioConst } = require('../lib/audio/constants');

class TestAudioClientManager extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new AudioClientBuilder();
        this.townMusicKey = 'reldens-new-age-town';
    }

    async withFetchStatus(fetchStatus, testCallback)
    {
        let originalFetch = global.fetch;
        global.fetch = async (url) => ({status: fetchStatus(url)});
        try {
            await testCallback();
        } catch(error) {
            global.fetch = originalFetch;
            throw error;
        }
        global.fetch = originalFetch;
    }

    createGameManager(scene)
    {
        return {gameEngine: {scene: {getScene: () => scene}}};
    }

    async testACategoryCheckedAgainPlaysItsMusicAndStoresIt()
    {
        await this.test('a single audio category unchecked stops its music and checked again plays it and stores enabled 1', async () => {
            let audioManager = this.builder.createAudioManager({});
            let music = this.builder.createAudioInstance(this.townMusicKey);
            audioManager.playing.music = music;
            await audioManager.setAudio('music', false);
            let unchecked = [audioManager.playerConfig[this.builder.musicCategory.id], music.stops, music.mute];
            await audioManager.setAudio('music', true);
            this.assert.deepStrictEqual(
                [unchecked, [audioManager.playerConfig[this.builder.musicCategory.id], music.played, music.mute]],
                [[0, 1, true], [1, [this.townMusicKey], false]]
            );
        });
    }

    async testAnUncheckedMultiTrackCategoryStopsEveryAudio()
    {
        await this.test('an unchecked multi track category stops and mutes every playing audio', async () => {
            let audioManager = this.builder.createAudioManager({});
            let rightStep = this.builder.createAudioInstance('footstep');
            let leftStep = this.builder.createAudioInstance('footstep');
            audioManager.playing.sound = {i_journeyman_right: rightStep, r_journeyman_left: leftStep};
            await audioManager.setAudio('sound', false);
            this.assert.deepStrictEqual(
                [audioManager.playerConfig[this.builder.soundCategory.id], [rightStep.stops, rightStep.mute], [leftStep.stops, leftStep.mute]],
                [0, [1, true], [1, true]]
            );
        });
    }

    async testALockedMuteStateRefusesAToggle()
    {
        await this.test('a locked mute state refuses a category toggle and keeps the audio and the config', async () => {
            let audioManager = this.builder.createAudioManager({});
            let music = this.builder.createAudioInstance(this.townMusicKey);
            audioManager.playing.music = music;
            audioManager.lockedMuteState = true;
            this.assert.deepStrictEqual(
                [await audioManager.setAudio('music', false), audioManager.playerConfig, music.stops],
                [false, {}, 0]
            );
        });
    }

    async testTheAdEndRestoresTheMutedCategories()
    {
        await this.test('the ad end plays the muted categories again, stores them enabled and releases the lock', async () => {
            let audioManager = this.builder.createAudioManager({});
            let music = this.builder.createAudioInstance(this.townMusicKey);
            audioManager.playing.music = music;
            audioManager.changedMutedState = {music: true};
            audioManager.currentMuteState = true;
            audioManager.lockedMuteState = true;
            await audioManager.changeMuteState(false, false);
            this.assert.deepStrictEqual(
                [music.played, audioManager.playerConfig[this.builder.musicCategory.id], audioManager.lockedMuteState, audioManager.changedMutedState],
                [[this.townMusicKey], 1, false, {}]
            );
        });
    }

    async testAMissingAudioFileIsSkipped()
    {
        await this.test('an audio file answering not found is skipped and an audio without files is not loaded', async () => {
            let audioManager = this.builder.createAudioManager({});
            let scene = this.builder.createScene(this.builder.townSceneKey);
            await this.withFetchStatus((url) => -1 === url.indexOf('missing') ? 200 : 404, async () => {
                this.assert.deepStrictEqual(
                    await audioManager.prepareFiles({files_name: 'missing.mp3,reldens-town.mp3'}),
                    [AudioConst.AUDIO_BUCKET+'/reldens-town.mp3']
                );
                await audioManager.loadAudiosInScene({gone: {audio_key: 'gone', files_name: 'missing.mp3'}}, scene);
            });
            this.assert.deepStrictEqual(scene.loaders, []);
        });
    }

    async testTheUpdateMessageLoadsTheAudioInTheRoom()
    {
        await this.test('an audio update message loads the audio with its markers in the room of the message', async () => {
            let audioManager = this.builder.createAudioManager({});
            let scene = this.builder.createScene(this.builder.townSceneKey);
            let roomAudio = {
                audio_key: 'town-night',
                files_name: 'town-night.mp3',
                related_audio_markers: [{marker_key: 'TownNight', start: 0, duration: 30}]
            };
            await this.withFetchStatus(() => 200, async () => {
                await audioManager.processUpdateData(
                    {act: AudioConst.AUDIO_UPDATE, audios: [roomAudio]},
                    {name: this.builder.townSceneKey},
                    this.createGameManager(scene)
                );
            });
            await this.builder.completeLoad(scene, scene.loaders[0]);
            let loadedAudio = audioManager.roomsAudios[this.builder.townSceneKey]['town-night'];
            this.assert.deepStrictEqual(
                [scene.loaders[0].files, Object.keys(loadedAudio.audioInstance.markers), scene.emittedEvents],
                [[AudioConst.AUDIO_BUCKET+'/town-night.mp3'], ['TownNight'], ['reldens.audioLoaded', 'reldens.allAudiosLoaded']]
            );
        });
    }

    async testTheRoomChangeStopsThePreviousAudios()
    {
        await this.test('the room change stops the playing music and every playing sound', async () => {
            let audioManager = this.builder.createAudioManager({});
            let music = this.builder.createAudioInstance(this.townMusicKey);
            let step = this.builder.createAudioInstance('footstep');
            audioManager.playing.music = music;
            audioManager.playing.sound = {i_journeyman_right: step};
            audioManager.destroySceneAudios();
            this.assert.deepStrictEqual(
                [music.stops, step.stops, Object.keys(audioManager.playing)],
                [1, 1, ['sound']]
            );
        });
    }

    async testTheMessagesBeforeTheSceneAreQueued()
    {
        await this.test('the audio messages received before the scene is ready are queued and applied in order', async () => {
            let processed = [];
            let gameManager = {audioManager: {
                processUpdateData: async (message) => processed.push('update:'+message.id),
                processDeleteData: async (message) => processed.push('delete:'+message.id)
            }};
            let messagesListener = new MessagesListener();
            await messagesListener.processMessage({act: AudioConst.AUDIO_UPDATE, id: 1}, {}, gameManager);
            await messagesListener.processMessage({act: AudioConst.AUDIO_DELETE, id: 2}, {}, gameManager);
            let beforeReady = [...processed];
            await messagesListener.processQueue();
            await messagesListener.processMessage({act: AudioConst.AUDIO_UPDATE, id: 3}, {}, gameManager);
            this.assert.deepStrictEqual(
                [beforeReady, processed, messagesListener.queueMessages],
                [[], ['update:1', 'delete:2', 'update:3'], []]
            );
        });
    }

    createUiScene(audioManager, inputs)
    {
        let uiScene = {cache: {html: {get: (templateKey) => templateKey}}};
        uiScene.gameManager = {
            audioManager,
            sentMessages: [],
            appended: [],
            services: {translator: {t: (snippetKey) => snippetKey}},
            gameEngine: {parseTemplate: (template, data) => template+'|'+JSON.stringify(data)+';'},
            gameDom: {getElements: () => inputs},
            getActiveScene: () => ({key: this.builder.townSceneKey, associatedAudio: false})
        };
        uiScene.gameManager.gameDom.appendToElement = (selector, content) => uiScene.gameManager.appended.push(content);
        uiScene.gameManager.activeRoomEvents = {send: (message) => uiScene.gameManager.sentMessages.push(message)};
        return uiScene;
    }

    createSettingInput(category, checked)
    {
        let input = {checked, value: category.category_key, dataset: {categoryKey: category.category_key}, listeners: {}};
        input.addEventListener = (eventName, callback) => Object.assign(input.listeners, {[eventName]: callback});
        return input;
    }

    async testTheSettingsListEveryCategoryWithItsChecked()
    {
        await this.test('the settings list every category checked from the player config or the category default', async () => {
            let audioManager = this.builder.createAudioManager({[this.builder.soundCategory.id]: 0});
            let audioUi = new AudioUi(this.createUiScene(audioManager, []));
            let rows = audioUi.prepareCategoriesRows('row').split(';').filter(row => '' !== row).map(
                row => JSON.parse(row.split('|')[1])
            );
            this.assert.deepStrictEqual(
                rows.map(row => [row.categoryKey, row.categoryChecked]),
                [['music', ' checked="checked"'], ['sound', '']]
            );
        });
    }

    async testAnUncheckedCategorySendsTheUpdateAndStopsItsAudio()
    {
        await this.test('unchecking a category in the settings stops its audio, stores it and sends the update', async () => {
            let audioManager = this.builder.createAudioManager({});
            let music = this.builder.createAudioInstance(this.townMusicKey);
            audioManager.playing.music = music;
            let musicInput = this.createSettingInput(this.builder.musicCategory, false);
            let uiScene = this.createUiScene(audioManager, [musicInput]);
            new AudioUi(uiScene).createUi();
            await musicInput.listeners.click({target: musicInput});
            this.assert.deepStrictEqual(
                [music.stops, audioManager.playerConfig[this.builder.musicCategory.id], uiScene.gameManager.sentMessages.map(message => Object.assign({}, message))],
                [1, 0, [{act: AudioConst.AUDIO_UPDATE, ck: 'music', uv: false}]]
            );
        });
    }

}

module.exports.TestAudioClientManager = TestAudioClientManager;
