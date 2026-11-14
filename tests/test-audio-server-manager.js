/**
 *
 * Reldens - Test Audio Server Manager
 *
 * Tests the server audio manager: only the enabled categories are loaded, an audio update for an unknown category or
 * player stores nothing, the repeated toggles of a category are saved one after another with the last value stored,
 * and the hot plug callbacks are not created with the hot plug disabled.
 *
 */

const timersPromises = require('timers/promises');
const { BaseTest } = require('./base-test');
const { AudioManager } = require('../lib/audio/server/manager');
const { AudioHotPlugCallbacks } = require('../lib/audio/server/audio-hot-plug-callbacks');
const { AudioConst } = require('../lib/audio/constants');

class TestAudioServerManager extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.musicCategory = {id: 1, category_key: 'music', enabled: 1, single_audio: 1};
        this.soundCategory = {id: 3, category_key: 'sound', enabled: 1, single_audio: 0};
        this.disabledCategory = {id: 4, category_key: 'ambient', enabled: 0, single_audio: 1};
        this.townRoomId = 41;
        this.forestRoomId = 114;
    }

    createAudioManager(setup)
    {
        let repositories = {
            audio: {},
            audioCategories: {
                loadBy: async (field, value) => setup.categoriesRows.filter(row => value === row[field]),
                loadOneBy: async (field, value) => setup.categoriesRows.find(row => value === row[field])
            },
            audioPlayerConfig: {upsert: async (data) => this.storePlayerConfig(setup, data)}
        };
        return new AudioManager({
            roomsManager: setup.roomsManager,
            dataServer: {getEntity: (entityName) => repositories[entityName]}
        });
    }

    async storePlayerConfig(setup, data)
    {
        setup.saveSteps.push('start:'+data.enabled);
        await timersPromises.setTimeout(setup.saveDelays.shift() || 0);
        setup.storedConfigs.push(data);
        setup.saveSteps.push('end:'+data.enabled);
        return data;
    }

    createSetup()
    {
        let setup = {
            categoriesRows: [this.musicCategory, this.soundCategory, this.disabledCategory],
            saveSteps: [],
            saveDelays: [],
            storedConfigs: [],
            broadcasts: {}
        };
        let townRoom = {broadcast: (channel, message) => this.recordBroadcast(setup, this.townRoomId, message)};
        let forestRoom = {broadcast: (channel, message) => this.recordBroadcast(setup, this.forestRoomId, message)};
        setup.roomsManager = {
            createdInstances: {[this.townRoomId]: townRoom, [this.forestRoomId]: forestRoom},
            findRoomInstanceById: (roomId) => setup.roomsManager.createdInstances[roomId]
        };
        return setup;
    }

    recordBroadcast(setup, roomId, message)
    {
        if(!setup.broadcasts[roomId]){
            setup.broadcasts[roomId] = [];
        }
        setup.broadcasts[roomId].push(message);
    }

    createUpdateRoom(playerId)
    {
        return {playerBySessionIdFromState: () => playerId ? {player_id: playerId} : false};
    }

    async testOnlyTheEnabledCategoriesAreLoaded()
    {
        await this.test('only the enabled audio categories are loaded', async () => {
            let audioManager = this.createAudioManager(this.createSetup());
            await audioManager.loadAudioCategories();
            this.assert.deepStrictEqual(
                audioManager.categories.map(category => category.category_key),
                ['music', 'sound']
            );
        });
    }

    async testAnUpdateForAnUnknownCategoryOrPlayerStoresNothing()
    {
        await this.test('an audio update for an unknown category, another act or a missing player stores nothing', async () => {
            let setup = this.createSetup();
            let audioManager = this.createAudioManager(setup);
            let client = {sessionId: 'session-a'};
            let unknownCategory = {act: AudioConst.AUDIO_UPDATE, ck: 'voices', uv: true};
            let results = [
                await audioManager.executeMessageActions(client, unknownCategory, this.createUpdateRoom(5)),
                await audioManager.executeMessageActions(client, {act: AudioConst.AUDIO_DELETE, ck: 'music', uv: true}, this.createUpdateRoom(5)),
                await audioManager.executeMessageActions(client, {act: AudioConst.AUDIO_UPDATE, ck: 'music', uv: true}, this.createUpdateRoom(0))
            ];
            this.assert.deepStrictEqual([results, setup.storedConfigs], [[false, false, false], []]);
        });
    }

    async testRepeatedTogglesAreSavedInOrderWithTheLastValueStored()
    {
        await this.test('repeated toggles of a category are saved one after another and the last value is stored', async () => {
            let setup = this.createSetup();
            setup.saveDelays = [20, 5, 0];
            let audioManager = this.createAudioManager(setup);
            let client = {sessionId: 'session-a'};
            let room = this.createUpdateRoom(5);
            await Promise.all([true, false, true].map(
                updateValue => audioManager.executeMessageActions(client, {act: AudioConst.AUDIO_UPDATE, ck: 'music', uv: updateValue}, room)
            ));
            this.assert.deepStrictEqual(
                [setup.saveSteps, setup.storedConfigs.pop()],
                [['start:1', 'end:1', 'start:0', 'end:0', 'start:1', 'end:1'], {enabled: 1, player_id: 5, category_id: 1}]
            );
        });
    }

    async testTheHotPlugCallbacksAreNotCreatedWithTheHotPlugDisabled()
    {
        await this.test('the audio hot plug callbacks are not created with the hot plug disabled', async () => {
            let projectConfig = {isHotPlugEnabled: false};
            this.assert.deepStrictEqual(
                [
                    AudioHotPlugCallbacks.beforeDeleteCallback(projectConfig, 'bucket', 'dist'),
                    AudioHotPlugCallbacks.beforeUpdateCallback(projectConfig, 'bucket', 'dist'),
                    AudioHotPlugCallbacks.afterUpdateCallback(projectConfig, 'bucket', 'dist')
                ],
                [false, false, false]
            );
            this.assert.strictEqual(typeof AudioHotPlugCallbacks.afterUpdateCallback({isHotPlugEnabled: true}, 'bucket', 'dist'), 'function');
        });
    }

}

module.exports.TestAudioServerManager = TestAudioServerManager;
