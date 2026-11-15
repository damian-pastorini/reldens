/**
 *
 * Reldens - Test CrazyGames Videos Handler
 *
 * Tests the CrazyGames VideosHandler activation with a stubbed SDK and events manager: an event video ad without its
 * event key is ignored with no listener, and the event of an activated video ad while another ad is playing requests
 * nothing from the SDK.
 *
 */

const { BaseTest } = require('./base-test');
const { VideosHandler } = require('../lib/ads/client/providers/crazy-games/videos-handler');

class TestCrazyGamesVideosHandler extends BaseTest
{

    createHandler(setup)
    {
        setup.listeners = {};
        setup.requestedAds = [];
        return new VideosHandler({
            gameManager: {
                config: {getWithoutLogs: (path, defaultValue) => defaultValue},
                events: {on: (eventName, callback) => setup.listeners[eventName] = callback}
            },
            sdk: {ad: {requestAd: async (adType) => setup.requestedAds.push(adType)}},
            hasAdblock: async () => false,
            isEnabled: async () => true
        });
    }

    async testAnEventVideoAdWithoutEventKeyIsIgnored()
    {
        await this.test('an event video ad without its event key is ignored with no listener', async () => {
            let setup = {};
            this.assert.strictEqual(await this.createHandler(setup).activateAdVideo({id: 'video-ad'}), false);
            this.assert.deepStrictEqual(Object.keys(setup.listeners), []);
        });
    }

    async testTheVideoAdEventWhileAnotherAdPlaysRequestsNothing()
    {
        await this.test('the video ad event while another ad plays requests nothing from the SDK', async () => {
            let setup = {};
            let handler = this.createHandler(setup);
            await handler.activateAdVideo({id: 'video-ad', eventKey: 'reldens.videoAdEvent'});
            handler.isPlayingAd = true;
            this.assert.strictEqual(await setup.listeners['reldens.videoAdEvent'](), false);
            this.assert.deepStrictEqual(setup.requestedAds, []);
        });
    }

}

module.exports.TestCrazyGamesVideosHandler = TestCrazyGamesVideosHandler;
