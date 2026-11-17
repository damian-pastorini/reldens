/**
 *
 * Reldens - Test CrazyGames Video Ads
 *
 */

const { BaseTest } = require('./base-test');
const { CrazyGamesProviderBuilder } = require('./fixtures/crazy-games-provider-builder');
const { AdsConst } = require('../lib/ads/constants');

class TestCrazyGamesVideoAds extends BaseTest
{

    async createActiveProvider(builder, videoAds)
    {
        builder.loadSdk();
        let provider = builder.createProvider(videoAds);
        await provider.activate();
        this.assert.deepStrictEqual(Object.keys(builder.listeners), videoAds.map(videoAd => videoAd.eventKey));
        return provider;
    }

    async testVideoAdsAreListenedOnceTheSdkLoadsOnARetry()
    {
        await this.test('the video ads are listened only once the SDK is found on a retry', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let provider = builder.createProvider([builder.videoAd(5, builder.eventKey)]);
            this.assert.strictEqual(await builder.captureTimeouts(async () => await provider.activate()), false);
            this.assert.deepStrictEqual(
                builder.scheduledTimeouts.map(scheduledTimeout => scheduledTimeout.delayMs),
                [provider.metaData.sdkRetryTime]
            );
            this.assert.deepStrictEqual(builder.listeners, {});
            builder.loadSdk();
            await builder.runScheduledTimeout(provider, 'activate');
            this.assert.strictEqual(provider.retry, 1);
            this.assert.deepStrictEqual(Object.keys(builder.listeners), [builder.eventKey]);
            await builder.listeners[builder.eventKey]();
            this.assert.deepStrictEqual(builder.requestedAds.map(requestedAd => requestedAd.adType), ['midgame']);
        });
    }

    async testSdkMissingAfterTheMaximumRetriesStopsRetrying()
    {
        await this.test('the SDK missing after the maximum retries stops retrying and listens no ad', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let provider = builder.createProvider([builder.videoAd(5, builder.eventKey)]);
            provider.retry = provider.metaData.sdkMaxRetries;
            this.assert.strictEqual(await builder.captureTimeouts(async () => await provider.activate()), false);
            this.assert.deepStrictEqual(builder.scheduledTimeouts, []);
            this.assert.deepStrictEqual(builder.listeners, {});
            this.assert.deepStrictEqual(builder.requestedAds, []);
        });
    }

    async testDisabledEnvironmentRequestsNoAd()
    {
        await this.test('a disabled SDK environment requests no ad', async () => {
            let builder = new CrazyGamesProviderBuilder();
            builder.environment = AdsConst.ENVIRONMENTS.DISABLED;
            let provider = await this.createActiveProvider(builder, [builder.videoAd(5, builder.eventKey)]);
            this.assert.strictEqual(await builder.listeners[builder.eventKey](), false);
            this.assert.deepStrictEqual(builder.requestedAds, []);
            this.assert.strictEqual(provider.environment, AdsConst.ENVIRONMENTS.DISABLED);
        });
    }

    async testAdblockListensNoAd()
    {
        await this.test('an adblock detected on the activation listens no ad', async () => {
            let builder = new CrazyGamesProviderBuilder();
            builder.adblockDetected = true;
            builder.loadSdk();
            let provider = builder.createProvider([builder.videoAd(5, builder.eventKey)]);
            this.assert.strictEqual(await provider.activate(), false);
            this.assert.deepStrictEqual(builder.listeners, {});
            this.assert.deepStrictEqual(builder.requestedAds, []);
        });
    }

    async testAdblockCheckErrorIsTakenAsNoAdblock()
    {
        await this.test('an adblock check that throws is taken as no adblock and the ad is requested', async () => {
            let builder = new CrazyGamesProviderBuilder();
            builder.adblockCheckError = new Error('Mocked adblock check error.');
            await this.createActiveProvider(builder, [builder.videoAd(5, builder.eventKey)]);
            await builder.listeners[builder.eventKey]();
            this.assert.strictEqual(builder.requestedAds.length, 1);
        });
    }

    async testAdEventWhileAnotherAdPlaysRequestsNothing()
    {
        await this.test('an ad event while another ad is playing requests nothing', async () => {
            let builder = new CrazyGamesProviderBuilder();
            await this.createActiveProvider(builder, [builder.videoAd(5, builder.eventKey)]);
            await builder.listeners[builder.eventKey]();
            builder.requestedAds[0].callbacks.adStarted();
            this.assert.strictEqual(await builder.listeners[builder.eventKey](), false);
            this.assert.strictEqual(builder.requestedAds.length, 1);
            this.assert.deepStrictEqual(builder.sentMessages, [{act: AdsConst.ACTIONS.AD_STARTED, ads_id: 5}]);
        });
    }

    async testPlayedNonReplayAdIsNotRequestedAgain()
    {
        await this.test('a played non replay ad is not requested again and a played replay ad is', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let replayEventKey = builder.eventKey+'-replay';
            builder.adsPlugin.playedAds = {5: {ads_id: 5}, 6: {ads_id: 6}};
            await this.createActiveProvider(builder, [
                builder.videoAd(5, builder.eventKey, {replay: false}),
                builder.videoAd(6, replayEventKey, {replay: true})
            ]);
            await builder.listeners[builder.eventKey]();
            this.assert.deepStrictEqual(builder.requestedAds, []);
            await builder.listeners[replayEventKey]();
            this.assert.strictEqual(builder.requestedAds.length, 1);
        });
    }

    async testAdWaitsForThePlayedAdsList()
    {
        await this.test('an ad fired before the played ads list arrived is requested after the wait', async () => {
            let builder = new CrazyGamesProviderBuilder();
            builder.adsPlugin.playedAds = null;
            let provider = await this.createActiveProvider(builder, [builder.videoAd(5, builder.eventKey)]);
            this.assert.strictEqual(await builder.captureTimeouts(async () => await builder.listeners[builder.eventKey]()), false);
            this.assert.deepStrictEqual(
                builder.scheduledTimeouts.map(scheduledTimeout => scheduledTimeout.delayMs),
                [AdsConst.AWAIT_ADS_TIME]
            );
            this.assert.deepStrictEqual(builder.requestedAds, []);
            builder.adsPlugin.playedAds = {};
            await builder.runScheduledTimeout(provider.videosHandler, 'tryRePlay');
            this.assert.strictEqual(builder.requestedAds.length, 1);
        });
    }

    async testAudioIsMutedWhileTheAdPlays()
    {
        await this.test('the audio is muted while the ad plays and restored when it ends or fails, with the ad messages', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let provider = await this.createActiveProvider(builder, [builder.videoAd(5, builder.eventKey)]);
            await builder.listeners[builder.eventKey]();
            this.assert.deepStrictEqual(builder.muteStates, [[true, true]]);
            builder.requestedAds[0].callbacks.adStarted();
            await builder.requestedAds[0].callbacks.adFinished();
            this.assert.strictEqual(provider.videosHandler.isPlayingAd, false);
            await builder.listeners[builder.eventKey]();
            await builder.requestedAds[1].callbacks.adError('Mocked error.');
            this.assert.deepStrictEqual(builder.muteStates, [[true, true], [false, false], [true, true], [false, false]]);
            this.assert.deepStrictEqual(builder.sentMessages, [
                {act: AdsConst.ACTIONS.AD_STARTED, ads_id: 5},
                {act: AdsConst.ACTIONS.AD_ENDED, ads_id: 5},
                {act: AdsConst.ACTIONS.AD_FAILED, ads_id: 5, error: 'Mocked error.'}
            ]);
        });
    }

    async testAdTypeFollowsTheRewardItem()
    {
        await this.test('an ad without reward item is requested as midgame and one with a reward item as rewarded', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let rewardedEventKey = builder.eventKey+'-rewarded';
            await this.createActiveProvider(builder, [
                builder.videoAd(5, builder.eventKey),
                builder.videoAd(6, rewardedEventKey, {rewardItemKey: 'coins'})
            ]);
            await builder.listeners[builder.eventKey]();
            builder.requestedAds[0].callbacks.adStarted();
            await builder.requestedAds[0].callbacks.adFinished();
            await builder.listeners[rewardedEventKey]();
            this.assert.deepStrictEqual(builder.requestedAds.map(requestedAd => requestedAd.adType), ['midgame', 'rewarded']);
        });
    }

}

module.exports.TestCrazyGamesVideoAds = TestCrazyGamesVideoAds;
