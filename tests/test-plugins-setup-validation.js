/**
 *
 * Reldens - Test Plugins Setup Validation
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ActionsPlugin } = require('../lib/actions/server/plugin');
const ActionsClientPluginModule = require('../lib/actions/client/plugin');
const { AdsPlugin } = require('../lib/ads/server/plugin');
const { AdsMessageActions } = require('../lib/ads/server/message-actions');
const { ActionsConst } = require('../lib/actions/constants');
const { sc } = require('@reldens/utils');

class TestPluginsSetupValidation extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.adsPlayedRepository = {loadOne: async (filters) => filters};
        this.deathEvents = [
            'reldens.playerDeath',
            'reldens.playerReviveReady',
            'reldens.afterGiveAdRewardItem',
            'reldens.afterAdStarted',
            'reldens.afterAdEnded',
            'reldens.beforeSceneExecuteMessages'
        ];
        this.actionsEvents = [
            'reldens.beforeSuperInitialGameData',
            'reldens.roomsMessageActionsByRoom',
            'reldens.createdPlayerSchema',
            'reldens.createdNewPlayer',
            'reldens.sceneRoomOnCreate',
            'reldens.onRoomDispose'
        ];
    }

    createProps()
    {
        let props = {listenedEvents: {}};
        props.events = {
            on: (eventKey, callback) => {
                props.listenedEvents[eventKey] = (props.listenedEvents[eventKey] || []).concat([callback]);
            }
        };
        props.dataServer = {getEntity: (entityKey) => 'adsPlayed' === entityKey ? this.adsPlayedRepository : false};
        props.config = GameplayPlayerBuilder.createConfigManager({});
        props.gameManager = {config: {client: {}, get: () => ({})}};
        return props;
    }

    assertListened(listenedEvents, eventKeys, expectedCount)
    {
        for(let eventKey of eventKeys){
            this.assert.strictEqual(sc.get(listenedEvents, eventKey, []).length, expectedCount, eventKey);
        }
    }

    async testActionsPluginWithoutEventsManager()
    {
        await this.test('the actions plugin attaches nothing without its events manager', async () => {
            let props = this.createProps();
            props.events = false;
            let plugin = new ActionsPlugin();
            plugin.setup(props);
            this.assert.deepStrictEqual(props.listenedEvents, {});
            this.assert.strictEqual(plugin.events, false);
            this.assert.strictEqual(plugin.listenEvents(), false);
            this.assert.notStrictEqual(plugin.playerDeathRelocator, false);
        });
    }

    async testActionsPluginWithoutConfig()
    {
        await this.test('the actions plugin attaches no death listener without its config', async () => {
            let props = this.createProps();
            let plugin = new ActionsPlugin();
            plugin.events = props.events;
            plugin.listenEvents();
            this.assertListened(props.listenedEvents, this.deathEvents, 0);
            this.assertListened(props.listenedEvents, this.actionsEvents, 1);
            this.assertListened(props.listenedEvents, ['reldens.serverReady'], 1);
            this.assert.strictEqual(plugin.listenDeathEvents(), false);
            this.assertListened(props.listenedEvents, this.deathEvents, 0);
        });
    }

    async testActionsPluginWithoutDataServer()
    {
        await this.test('the actions plugin keeps its listeners without its data server', async () => {
            let props = this.createProps();
            props.dataServer = false;
            let plugin = new ActionsPlugin();
            plugin.setup(props);
            this.assert.strictEqual(plugin.dataServer, false);
            this.assertListened(props.listenedEvents, this.deathEvents, 1);
            this.assertListened(props.listenedEvents, this.actionsEvents, 1);
        });
    }

    async testActionsPluginWithEveryProperty()
    {
        await this.test('the actions plugin attaches every listener once with all its properties', async () => {
            let props = this.createProps();
            let plugin = new ActionsPlugin();
            plugin.setup(props);
            this.assertListened(props.listenedEvents, this.deathEvents, 1);
            this.assertListened(props.listenedEvents, this.actionsEvents, 1);
            this.assertListened(props.listenedEvents, ['reldens.serverReady'], 2);
            this.assert.strictEqual(plugin.playerDeathRelocator.config, props.config);
            this.assert.strictEqual(plugin.resurrectionAdGate.config, props.config);
            this.assert.strictEqual(plugin.deathReviveNotifier.playerDeathRelocator, plugin.playerDeathRelocator);
            this.assert.strictEqual(plugin.deathReviveRequests.deathReviveNotifier, plugin.deathReviveNotifier);
        });
    }

    async testActionsClientPluginStopsWithoutItsCoreProperties()
    {
        await this.test('the client actions plugin creates and attaches nothing without its core properties', async () => {
            for(let missingKey of ['gameManager', 'events']){
                let props = this.createProps();
                props[missingKey] = false;
                let plugin = new ActionsClientPluginModule.ActionsPlugin();
                this.assert.strictEqual(plugin.setup(props), false, missingKey);
                this.assert.deepStrictEqual(props.listenedEvents, {}, missingKey);
                this.assert.strictEqual(plugin.gameOverReviveMessage, false, missingKey);
            }
        });
    }

    async testActionsClientPluginGuards()
    {
        await this.test('the client actions plugin methods stop without their properties', async () => {
            let props = this.createProps();
            let plugin = new ActionsClientPluginModule.ActionsPlugin();
            plugin.events = props.events;
            this.assert.strictEqual(plugin.setTranslations(), false);
            this.assert.strictEqual(plugin.listenEvents(), false);
            plugin.events = false;
            plugin.gameManager = props.gameManager;
            this.assert.strictEqual(plugin.listenEvents(), false);
            this.assert.deepStrictEqual(props.listenedEvents, {});
            this.assert.deepStrictEqual(props.gameManager.config.client, {});
        });
    }

    async testActionsClientPluginWithEveryProperty()
    {
        await this.test('the client actions plugin prepares the game over message and its room listener', async () => {
            let props = this.createProps();
            let plugin = new ActionsClientPluginModule.ActionsPlugin();
            plugin.setup(props);
            this.assert.strictEqual(plugin.gameOverReviveMessage.gameManager, props.gameManager);
            this.assert.strictEqual(plugin.gameOverReviveMessage.events, props.events);
            this.assert.notDeepStrictEqual(props.gameManager.config.client.snippets, {});
            this.assert.strictEqual(
                props.gameManager.config.client.snippetsDataValues[ActionsConst.MESSAGE.DATA_VALUES.NAMESPACE].NAMESPACE,
                ActionsConst.MESSAGE.DATA_VALUES.NAMESPACE
            );
            let listenedRooms = [];
            plugin.gameOverReviveMessage = {listenRoomMessages: (room) => listenedRooms.push(room)};
            let room = {onMessage: () => true};
            this.assertListened(props.listenedEvents, ['reldens.activateRoom', 'reldens.createUiScene'], 1);
            props.listenedEvents['reldens.activateRoom'][0](room);
            this.assert.deepStrictEqual(listenedRooms, [room]);
        });
    }

    async testAdsPluginWithoutEventsManager()
    {
        await this.test('the ads plugin attaches nothing without its events manager', async () => {
            let props = this.createProps();
            props.events = false;
            let plugin = new AdsPlugin();
            plugin.setup(props);
            this.assert.deepStrictEqual(props.listenedEvents, {});
            this.assert.strictEqual(plugin.listenEvents(), false);
            this.assert.notStrictEqual(plugin.createPlayerAdsHandler, false);
        });
    }

    async testAdsPluginListenersWithoutDataServer()
    {
        await this.test('the ads plugin attaches no listener without its data server', async () => {
            let props = this.createProps();
            let plugin = new AdsPlugin();
            plugin.events = props.events;
            this.assert.strictEqual(plugin.listenEvents(), false);
            this.assert.deepStrictEqual(props.listenedEvents, {});
        });
    }

    async testAdsPluginWithEveryProperty()
    {
        await this.test('the ads plugin gives the message actions its data server and itself', async () => {
            let props = this.createProps();
            let plugin = new AdsPlugin();
            plugin.setup(props);
            this.assertListened(
                props.listenedEvents,
                ['reldens.serverConfigFeaturesReady', 'reldens.roomsMessageActionsGlobal', 'reldens.createPlayerAfter'],
                1
            );
            let roomMessageActions = {};
            props.listenedEvents['reldens.roomsMessageActionsGlobal'][0](roomMessageActions);
            this.assert.strictEqual(roomMessageActions.ads instanceof AdsMessageActions, true);
            this.assert.strictEqual(roomMessageActions.ads.dataServer, props.dataServer);
            this.assert.strictEqual(roomMessageActions.ads.adsPlugin, plugin);
            this.assert.strictEqual(roomMessageActions.ads.adsPlayedRepository, this.adsPlayedRepository);
        });
    }

    async testAdsMessageActionsWithoutDataServer()
    {
        await this.test('the ads message actions do nothing without the data server', async () => {
            let messageActions = new AdsMessageActions({adsPlugin: {}});
            this.assert.strictEqual(messageActions.adsPlayedRepository, false);
            this.assert.strictEqual(await messageActions.loadPlayedAd(1, 2), false);
            this.assert.strictEqual(await messageActions.executeMessageActions({}, {act: 'none'}, {}, {}), false);
        });
    }

    async testAdsMessageActionsWithoutAdsPlugin()
    {
        await this.test('the ads message actions do not execute without the ads plugin', async () => {
            let messageActions = new AdsMessageActions({dataServer: this.createProps().dataServer});
            this.assert.strictEqual(messageActions.adsPlayedRepository, this.adsPlayedRepository);
            this.assert.strictEqual(await messageActions.executeMessageActions({}, {act: 'none'}, {}, {}), false);
        });
    }

    async testAdsMessageActionsWithEveryProperty()
    {
        await this.test('the ads message actions load the played ad and execute with all their properties', async () => {
            let messageActions = new AdsMessageActions({dataServer: this.createProps().dataServer, adsPlugin: {}});
            let executeArguments = {client: {id: 1}, data: {act: 'none'}, room: {id: 2}, playerSchema: {id: 3}};
            this.assert.deepStrictEqual(await messageActions.loadPlayedAd(1, 2), {player_id: 1, ads_id: 2});
            this.assert.deepStrictEqual(
                await messageActions.executeMessageActions(
                    executeArguments.client,
                    executeArguments.data,
                    executeArguments.room,
                    executeArguments.playerSchema
                ),
                executeArguments
            );
        });
    }

}

module.exports.TestPluginsSetupValidation = TestPluginsSetupValidation;
