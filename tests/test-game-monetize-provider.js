/**
 *
 * Reldens - Test GameMonetize Provider
 *
 * Tests the GameMonetize ads provider activated with one event video ad and a real events manager, the SDK events
 * arriving as the reldens.gameMonetizeSdkEvent the SDK options emit: the SDK_READY event takes the SDK of the window,
 * the ad event shows the banner of that SDK, the
 * CONTENT_PAUSE_REQUESTED event sends AD_STARTED for that ad and mutes and locks the audio, the SDK_GAME_START event
 * sends AD_ENDED and restores the audio; an ad event while the ad plays is ignored and the next one after its end
 * plays again; and an SDK without showBanner logs the SDK not ready and plays nothing.
 *
 */

const { BaseTest } = require('./base-test');
const { LoggerOutputCapture } = require('./fixtures/logger-output-capture');
const { GameMonetize } = require('../lib/ads/client/providers/game-monetize');
const { AdsConst } = require('../lib/ads/constants');
const { EventsManager, Logger } = require('@reldens/utils');

class TestGameMonetizeProvider extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.providerId = 2;
        this.adEventKey = 'reldens.gameMonetizeTestAdEvent';
        this.videoAd = {
            id: 1,
            key: 'game-monetize-video',
            type: {key: AdsConst.ADS_TYPES.EVENT_VIDEO},
            provider: {id: this.providerId},
            enabled: true,
            eventKey: this.adEventKey
        };
    }

    async activateProvider(withShowBanner)
    {
        let setup = {sentMessages: [], muteStates: [], shownBanners: 0, events: new EventsManager(), window: {sdk: {}}};
        if(withShowBanner){
            setup.window.sdk.showBanner = async () => setup.shownBanners++;
        }
        setup.provider = new GameMonetize({id: this.providerId}, {
            gameDom: {getWindow: () => setup.window},
            events: setup.events,
            config: {get: () => ({[this.videoAd.id]: this.videoAd}), getWithoutLogs: (path, defaultValue) => defaultValue},
            getFeature: () => ({playedAds: {}}),
            audioManager: {changeMuteState: async (muted, locked) => setup.muteStates.push([muted, locked])},
            activeRoomEvents: {send: (message) => setup.sentMessages.push(message)}
        });
        await setup.provider.activate();
        return setup;
    }

    async testAnAdSendsItsStartAndEndAndMutesTheAudioWhileItPlays()
    {
        await this.test('the SDK ready, pause and start events show the ready SDK banner and send the ad start and end', async () => {
            let setup = await this.activateProvider(true);
            let readySdkBanners = [];
            setup.window.sdk = {showBanner: async () => readySdkBanners.push(this.videoAd.id)};
            await setup.events.emit(AdsConst.EVENTS.GAME_MONETIZE_SDK, {name: 'SDK_READY'});
            await setup.events.emit(this.adEventKey, {});
            await setup.events.emit(AdsConst.EVENTS.GAME_MONETIZE_SDK, {name: 'CONTENT_PAUSE_REQUESTED'});
            let playingAfterPause = setup.provider.isPlayingAd;
            await setup.events.emit(AdsConst.EVENTS.GAME_MONETIZE_SDK, {name: 'SDK_GAME_START'});
            this.assert.deepStrictEqual([setup.shownBanners, readySdkBanners], [0, [this.videoAd.id]]);
            this.assert.deepStrictEqual(
                [playingAfterPause, setup.provider.isPlayingAd, setup.sentMessages, setup.muteStates],
                [
                    true,
                    false,
                    [
                        {act: AdsConst.ACTIONS.AD_STARTED, ads_id: this.videoAd.id},
                        {act: AdsConst.ACTIONS.AD_ENDED, ads_id: this.videoAd.id}
                    ],
                    [[true, true], [false, false]]
                ]
            );
        });
    }

    async testAnAdEventWhileAnAdPlaysIsIgnored()
    {
        await this.test('an ad event while the ad plays is ignored and the next one after its end plays again', async () => {
            let setup = await this.activateProvider(true);
            await setup.events.emit(this.adEventKey, {});
            await setup.events.emit(AdsConst.EVENTS.GAME_MONETIZE_SDK, {name: 'CONTENT_PAUSE_REQUESTED'});
            await setup.events.emit(this.adEventKey, {});
            let bannersWhilePlaying = setup.shownBanners;
            await setup.events.emit(AdsConst.EVENTS.GAME_MONETIZE_SDK, {name: 'SDK_GAME_START'});
            await setup.events.emit(this.adEventKey, {});
            this.assert.deepStrictEqual([bannersWhilePlaying, setup.shownBanners], [1, 2]);
        });
    }

    async testAnSdkWithoutShowBannerPlaysNothing()
    {
        await this.test('an SDK without showBanner logs the SDK not ready and plays nothing', async () => {
            let setup = await this.activateProvider(false);
            let loggedText = await LoggerOutputCapture.capture(
                Logger.logLevels.critical,
                async () => await setup.events.emit(this.adEventKey, {})
            );
            this.assert.deepStrictEqual(
                [loggedText.includes('GameMonetize SDK not ready.'), setup.provider.isPlayingAd, setup.sentMessages],
                [true, false, []]
            );
        });
    }

}

module.exports.TestGameMonetizeProvider = TestGameMonetizeProvider;
