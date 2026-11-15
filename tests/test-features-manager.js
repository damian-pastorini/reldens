/**
 *
 * Reldens - Test Features Manager
 *
 * Tests the server FeaturesManager.loadFeatures with a stubbed storage and test features: only the features stored with
 * is_enabled 1 are loaded, a known enabled feature has its package set up and listed, a row returned with is_enabled 0
 * is never set up, and an enabled code without a server feature package is skipped while its code is still sent to the
 * client codes list; and a feature stored with is_enabled 0 is neither set up nor sent to the client, and once it is
 * stored enabled again a new load (the server restart) sets it up and sends its code to the client.
 *
 */

const { BaseTest } = require('./base-test');
const { FeaturesManager } = require('../lib/features/server/manager');

class TestFeaturesManager extends BaseTest
{

    createFeaturesManager(setup, storedRows)
    {
        setup.loadByCalls = [];
        setup.setups = [];
        setup.emitted = [];
        let featuresManager = new FeaturesManager({
            events: {emit: (eventName) => setup.emitted.push(eventName)},
            dataServer: {getEntity: () => ({loadBy: async (field, value) => {
                setup.loadByCalls.push([field, value]);
                return storedRows;
            }})},
            config: {},
            themeManager: {}
        });
        featuresManager.availableFeatures = {
            chat: class {
                async setup(props)
                {
                    setup.setups.push(['chat', props.featuresManager === featuresManager]);
                }
            },
            teams: class {
                async setup()
                {
                    setup.setups.push(['teams', true]);
                }
            }
        };
        return featuresManager;
    }

    async testOnlyTheEnabledKnownFeaturesAreSetUp()
    {
        await this.test('only the enabled features with a server package are set up and listed', async () => {
            let setup = {};
            let featuresManager = this.createFeaturesManager(setup, [
                {code: 'chat', is_enabled: 1},
                {code: 'teams', is_enabled: 0},
                {code: 'unknown-feature', is_enabled: 1}
            ]);
            let codesList = await featuresManager.loadFeatures();
            this.assert.deepStrictEqual(setup.loadByCalls, [['is_enabled', 1]]);
            this.assert.deepStrictEqual(setup.setups, [['chat', true]]);
            this.assert.deepStrictEqual(Object.keys(featuresManager.featuresList), ['chat']);
            this.assert.deepStrictEqual(codesList, ['chat', 'teams', 'unknown-feature']);
            this.assert.deepStrictEqual(setup.emitted, ['reldens.featuresManagerLoadFeaturesAfter']);
        });
    }

    async loadEnabledFeatures(storedRows)
    {
        let setup = {};
        setup.codesList = await this.createFeaturesManager(setup, storedRows.filter(row => 1 === row.is_enabled)).loadFeatures();
        return [setup.codesList, setup.setups.map(featureSetup => featureSetup[0])];
    }

    async testADisabledFeatureReturnsAfterItIsEnabledAndTheServerRestarts()
    {
        await this.test('a disabled feature is set up and sent to the client again after it is enabled and a restart', async () => {
            let storedRows = [{code: 'chat', is_enabled: 1}, {code: 'teams', is_enabled: 0}];
            let disabledLoad = await this.loadEnabledFeatures(storedRows);
            storedRows[1].is_enabled = 1;
            let restartLoad = await this.loadEnabledFeatures(storedRows);
            this.assert.deepStrictEqual(disabledLoad, [['chat'], ['chat']]);
            this.assert.deepStrictEqual(restartLoad, [['chat', 'teams'], ['chat', 'teams']]);
        });
    }

    async testFeaturesAreNotLoadedWithoutEventsOrStorage()
    {
        await this.test('the features are not loaded without the events manager or the data server', async () => {
            let missingEvents = new FeaturesManager({dataServer: {}});
            let missingStorage = new FeaturesManager({events: {emit: () => true}});
            this.assert.deepStrictEqual(
                [await missingEvents.loadFeatures(), await missingStorage.loadFeatures()],
                [false, false]
            );
        });
    }

}

module.exports.TestFeaturesManager = TestFeaturesManager;
