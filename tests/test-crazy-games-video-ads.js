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
        this.assert.strictEqual(await provider.activate(), true);
        return provider;
    }

    async testAdFiredBeforeTheSdkLoadsIsRequestedOnceTheSdkLoads()
    {
        await this.test('a video ad fired before the SDK loads is queued and requested once the SDK loads on a retry', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let provider = builder.createProvider([builder.videoAd(5, builder.eventKey)]);
            this.assert.strictEqual(await builder.captureTimeouts(async () => await provider.activate()), false);
            this.assert.deepStrictEqual(
                builder.scheduledTimeouts.map(scheduledTimeout => scheduledTimeout.delayMs),
                [provider.metaData.sdkRetryTime]
            );
            this.assert.strictEqual(await builder.listeners[builder.eventKey](), false);
            this.assert.deepStrictEqual(Object.keys(provider.videosHandler.queuedAds), ['5']);
            this.assert.deepStrictEqual(builder.requestedAds, []);
            builder.loadSdk();
            this.assert.deepStrictEqual(await builder.runScheduledTimeout(provider, 'activateSdk'), [true]);
            this.assert.strictEqual(provider.retry, 1);
            this.assert.deepStrictEqual(builder.requestedAds.map(requestedAd => requestedAd.adType), ['midgame']);
            this.assert.deepStrictEqual(provider.videosHandler.queuedAds, {});
        });
    }

    async testSameAdFiredTwiceBeforeTheSdkLoadsIsRequestedOnce()
    {
        await this.test('the same ad fired twice before the SDK loads is requested once', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let provider = builder.createProvider([builder.videoAd(5, builder.eventKey)]);
            await builder.captureTimeouts(async () => await provider.activate());
            await builder.listeners[builder.eventKey]();
            await builder.listeners[builder.eventKey]();
            builder.loadSdk();
            await builder.runScheduledTimeout(provider, 'activateSdk');
            this.assert.strictEqual(builder.requestedAds.length, 1);
        });
    }

    async testSdkMissingAfterTheMaximumRetriesStopsRetrying()
    {
        await this.test('the SDK missing after the maximum retries stops retrying and keeps the ads queued', async () => {
            let builder = new CrazyGamesProviderBuilder();
            let provider = builder.createProvider([builder.videoAd(5, builder.eventKey)]);
            provider.retry = provider.metaData.sdkMaxRetries;
            this.assert.strictEqual(await builder.captureTimeouts(async () => await provider.activate()), false);
            this.assert.deepStrictEqual(builder.scheduledTimeouts, []);
            this.assert.strictEqual(await builder.listeners[builder.eventKey](), false);
            this.assert.deepStrictEqual(Object.keys(provider.videosHandler.queuedAds), ['5']);
            this.assert.deepStrictEqual(builder.requestedAds, []);
        });
    }

    async testDisabledEnvironmentRequestsNoAd()
    {
        await this.test('a disabled SDK environment requests no ad, also for an ad queued before the SDK loaded', async () => {
            let builder = new CrazyGamesProviderBuilder();
            builder.environment = AdsConst.ENVIRONMENTS.DISABLED;
            let provider = await this.createActiveProvider(builder, [builder.videoAd(5, builder.eventKey)]);
            this.assert.strictEqual(await builder.listeners[builder.eventKey](), false);
            let queuingBuilder = new CrazyGamesProviderBuilder();
            queuingBuilder.environment = AdsConst.ENVIRONMENTS.DISABLED;
            let queuingProvider = queuingBuilder.createProvider([queuingBuilder.videoAd(5, queuingBuilder.eventKey)]);
            await queuingBuilder.captureTimeouts(async () => await queuingProvider.activate());
            await queuingBuilder.listeners[queuingBuilder.eventKey]();
            queuingBuilder.loadSdk();
            await queuingBuilder.runScheduledTimeout(queuingProvider, 'activateSdk');
            this.assert.deepStrictEqual(builder.requestedAds, []);
            this.assert.deepStrictEqual(queuingBuilder.requestedAds, []);
            this.assert.strictEqual(provider.environment, AdsConst.ENVIRONMENTS.DISABLED);
        });
    }

    async testAdblockLeavesTheQueuedAdUnplayedAndRefusesTheNextAds()
    {
        await this.test('an adblock detected on the SDK load plays no queued ad and refuses the next ad events', async () => {
            let builder = new CrazyGamesProviderBuilder();
            builder.adblockDetected = true;
            let provider = builder.createProvider([builder.videoAd(5, builder.eventKey)]);
            await builder.captureTimeouts(async () => await provider.activate());
            await builder.listeners[builder.eventKey]();
            builder.loadSdk();
            this.assert.deepStrictEqual(await builder.runScheduledTimeout(provider, 'activateSdk'), [false]);
            this.assert.strictEqual(await builder.listeners[builder.eventKey](), false);
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
