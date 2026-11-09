/**
 *
 * Reldens - Test Plugins Setup Validation
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ActionsPlugin } = require('../lib/actions/server/plugin');
const { AdsPlugin } = require('../lib/ads/server/plugin');
const { AdsMessageActions } = require('../lib/ads/server/message-actions');

class TestPluginsSetupValidation extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.adsPlayedRepository = {entityKey: 'adsPlayed'};
        this.deathEvents = [
            'reldens.serverReady',
            'reldens.playerDeath',
            'reldens.playerReviveReady',
            'reldens.afterGiveAdRewardItem',
            'reldens.afterAdStarted',
            'reldens.afterAdEnded',
            'reldens.beforeSceneExecuteMessages'
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
        return props;
    }

    assertNothingAttachedWithout(createPlugin, missingKeys, createdProperty)
    {
        for(let missingKey of missingKeys){
            let props = this.createProps();
            props[missingKey] = false;
            let plugin = createPlugin();
            this.assert.strictEqual(plugin.setup(props), false);
            this.assert.deepStrictEqual(props.listenedEvents, {});
            this.assert.strictEqual(plugin[createdProperty], false);
        }
    }

    async testActionsPluginValidatesItsPropertiesOnce()
    {
        await this.test('the actions plugin attaches nothing without its events, data server or config', async () => {
            this.assertNothingAttachedWithout(
                () => new ActionsPlugin(),
                ['events', 'dataServer', 'config'],
                'playerDeathRelocator'
            );
            let props = this.createProps();
            let plugin = new ActionsPlugin();
            this.assert.strictEqual(plugin.setup(props), true);
            for(let deathEvent of this.deathEvents){
                this.assert.strictEqual(0 < props.listenedEvents[deathEvent].length, true, deathEvent);
            }
            this.assert.strictEqual(plugin.playerDeathRelocator.config, props.config);
            this.assert.strictEqual(plugin.deathReviveNotifier.playerDeathRelocator, plugin.playerDeathRelocator);
        });
    }

    async testAdsPluginValidatesItsPropertiesOnce()
    {
        await this.test('the ads plugin attaches nothing without its events or data server', async () => {
            this.assertNothingAttachedWithout(() => new AdsPlugin(), ['events', 'dataServer'], 'createPlayerAdsHandler');
            let props = this.createProps();
            this.assert.strictEqual(new AdsPlugin().setup(props), true);
            let roomMessageActions = {};
            for(let attachActions of props.listenedEvents['reldens.roomsMessageActionsGlobal']){
                attachActions(roomMessageActions);
            }
            this.assert.strictEqual(roomMessageActions.ads instanceof AdsMessageActions, true);
            this.assert.strictEqual(roomMessageActions.ads.adsPlayedRepository, this.adsPlayedRepository);
        });
    }

}

module.exports.TestPluginsSetupValidation = TestPluginsSetupValidation;
