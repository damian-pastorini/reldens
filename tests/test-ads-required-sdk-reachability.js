/**
 *
 * Reldens - Test Ads Required SDK Reachability
 *
 */

const { BaseTest } = require('./base-test');
const { RequiredSdkReachabilityCheck } = require('../lib/ads/server/required-sdk-reachability-check');
const { AdsPlugin } = require('../lib/ads/server/plugin');
const { AdsConst } = require('../lib/ads/constants');
const { sc } = require('@reldens/utils');

class TestAdsRequiredSdkReachability extends BaseTest
{

    createCheck(responsesByUrl, requests)
    {
        return new RequiredSdkReachabilityCheck({
            timeoutMs: 1500,
            fetchRequest: async (url, options) => {
                requests.push({url, options});
                let response = responsesByUrl[url];
                if(response instanceof Error){
                    throw response;
                }
                return response;
            }
        });
    }

    createPluginListener(configValues)
    {
        let listeners = {};
        let plugin = new AdsPlugin();
        plugin.setup({
            events: {on: (eventKey, callback) => listeners[eventKey] = callback},
            dataServer: {getEntity: () => ({})},
            config: {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)}
        });
        plugin.adsStartHandler = {initialize: async () => true};
        return listeners['reldens.serverConfigFeaturesReady'];
    }

    async testReachableSdkPasses()
    {
        await this.test('the enabled providers with a reachable SDK pass the check with the timeout signal', async () => {
            let requests = [];
            let check = this.createCheck({'https://sdk.test/one.js': {ok: true}}, requests);
            this.assert.strictEqual(await check.areProvidersSdkReachable({
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'}
            }), true);
            this.assert.deepStrictEqual(requests.map(request => request.url), ['https://sdk.test/one.js']);
            this.assert.strictEqual(requests[0].options.signal instanceof AbortSignal, true);
        });
    }

    async testUnreachableSdkFailsAndStops()
    {
        await this.test('an SDK answering an error fails the check and the next providers are not requested', async () => {
            let requests = [];
            let check = this.createCheck({'https://sdk.test/one.js': {ok: false}}, requests);
            this.assert.strictEqual(await check.areProvidersSdkReachable({
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'},
                providerTwo: {enabled: 1, sdkUrl: 'https://sdk.test/two.js'}
            }), false);
            this.assert.deepStrictEqual(requests.map(request => request.url), ['https://sdk.test/one.js']);
        });
    }

    async testFailedRequestFailsTheCheck()
    {
        await this.test('an SDK request that throws (no answer or timeout) fails the check', async () => {
            let check = this.createCheck({'https://sdk.test/one.js': new Error('The operation was aborted.')}, []);
            this.assert.strictEqual(await check.areProvidersSdkReachable({
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'}
            }), false);
        });
    }

    async testDisabledRelativeAndEmptySdkAreSkipped()
    {
        await this.test('the disabled providers and the relative or empty SDK URLs are not requested', async () => {
            let requests = [];
            let check = this.createCheck({}, requests);
            this.assert.strictEqual(await check.areProvidersSdkReachable({
                providerOne: {enabled: 0, sdkUrl: 'https://sdk.test/one.js'},
                providerTwo: {enabled: 1, sdkUrl: '/assets/sdk.js'},
                providerThree: {enabled: 1}
            }), true);
            this.assert.deepStrictEqual(requests, []);
        });
    }

    async testAnSdkServedByThisServerIsSkipped()
    {
        await this.test('an absolute SDK URL under this server public or base URL is not requested, another origin is', async () => {
            let requests = [];
            let check = new RequiredSdkReachabilityCheck({
                timeoutMs: 1500,
                serverUrls: ['https://game.test/play/', 'http://localhost:8080'],
                fetchRequest: async (url) => requests.push(url) && {ok: true}
            });
            this.assert.strictEqual(await check.areProvidersSdkReachable({
                publicUrlSdk: {enabled: 1, sdkUrl: 'https://game.test/play/assets/sdk.js'},
                baseUrlSdk: {enabled: 1, sdkUrl: 'http://localhost:8080/assets/sdk.js'},
                otherPathSdk: {enabled: 1, sdkUrl: 'https://game.test/other/sdk.js'},
                otherPortSdk: {enabled: 1, sdkUrl: 'http://localhost:8081/assets/sdk.js'}
            }), true);
            this.assert.deepStrictEqual(requests, ['https://game.test/other/sdk.js', 'http://localhost:8081/assets/sdk.js']);
        });
    }

    async testTheSdkSettingsAreReadOnSetup()
    {
        await this.test('the SDK required, the check timeout and the server URLs are read once when the plugin is set up', async () => {
            let configValues = {
                [AdsConst.CONFIG_PATHS.SDK_REQUIRED]: true,
                [AdsConst.CONFIG_PATHS.SDK_CHECK_TIMEOUT]: 1500,
                'server/publicUrl': 'https://game.test',
                'server/baseUrl': 'http://localhost:8080'
            };
            let plugin = new AdsPlugin();
            plugin.setup({
                events: {on: () => true},
                dataServer: {getEntity: () => ({})},
                config: {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)}
            });
            configValues[AdsConst.CONFIG_PATHS.SDK_REQUIRED] = false;
            this.assert.deepStrictEqual(
                [plugin.sdkRequired, plugin.sdkCheckTimeout, plugin.serverUrls],
                [true, 1500, ['https://game.test', 'http://localhost:8080']]
            );
        });
    }

    async testSdkNotRequiredNeverStopsTheStart()
    {
        await this.test('the server start continues without checking the SDK when it is not required', async () => {
            let listener = this.createPluginListener({
                [AdsConst.CONFIG_PATHS.SDK_REQUIRED]: false,
                [AdsConst.CONFIG_PATHS.PROVIDERS]: {providerOne: {enabled: 1, sdkUrl: 'http://127.0.0.1:9/sdk.js'}}
            });
            let event = {configProcessor: {}, continueProcess: true};
            await listener(event);
            this.assert.strictEqual(event.continueProcess, true);
        });
    }

    async testRequiredSdkNotReachableStopsTheStart()
    {
        await this.test('the server start stops when a required SDK is not reachable', async () => {
            let listener = this.createPluginListener({
                [AdsConst.CONFIG_PATHS.SDK_REQUIRED]: true,
                [AdsConst.CONFIG_PATHS.SDK_CHECK_TIMEOUT]: 1500,
                [AdsConst.CONFIG_PATHS.PROVIDERS]: {providerOne: {enabled: 1, sdkUrl: 'http://127.0.0.1:9/sdk.js'}}
            });
            let event = {configProcessor: {}, continueProcess: true};
            await listener(event);
            this.assert.strictEqual(event.continueProcess, false);
        });
    }

    async testRequiredSdkWithoutCheckedUrlsKeepsAStoppedStart()
    {
        await this.test('a required SDK without checked URLs continues and never clears a start stopped before', async () => {
            let listener = this.createPluginListener({
                [AdsConst.CONFIG_PATHS.SDK_REQUIRED]: true,
                [AdsConst.CONFIG_PATHS.PROVIDERS]: {providerOne: {enabled: 0, sdkUrl: 'http://127.0.0.1:9/sdk.js'}}
            });
            let continuedEvent = {configProcessor: {}, continueProcess: true};
            await listener(continuedEvent);
            this.assert.strictEqual(continuedEvent.continueProcess, true);
            let stoppedEvent = {configProcessor: {}, continueProcess: false};
            await listener(stoppedEvent);
            this.assert.strictEqual(stoppedEvent.continueProcess, false);
        });
    }

}

module.exports.TestAdsRequiredSdkReachability = TestAdsRequiredSdkReachability;
