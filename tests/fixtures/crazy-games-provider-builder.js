/**
 *
 * Reldens - CrazyGames Provider Builder
 *
 * Builds the CrazyGames ads provider of the unit tests with a game manager stub (the events the provider listens, the
 * client ads collection, the ads plugin with its played ads, the audio manager and the room events that send the ads
 * messages) and an SDK stub, loaded in the window on demand, that answers the configured environment and adblock result
 * (or throws the configured adblock check error) and records every requested ad with its callbacks. The timeouts the provider schedules are captured, so a test runs
 * them on demand and awaits the activations or replays they start.
 *
 */

const { CrazyGames } = require('../../lib/ads/client/providers/crazy-games');
const { AdsConst } = require('../../lib/ads/constants');

class CrazyGamesProviderBuilder
{

    constructor()
    {
        this.providerId = 1;
        this.eventKey = 'reldens.activatedRoom_test-room';
        this.listeners = {};
        this.requestedAds = [];
        this.sentMessages = [];
        this.muteStates = [];
        this.scheduledTimeouts = [];
        this.adsPlugin = {playedAds: {}};
        this.environment = 'local';
        this.adblockDetected = false;
        this.adblockCheckError = false;
        this.adsCollection = {};
        this.window = {};
    }

    videoAd(id, eventKey, props = {})
    {
        return Object.assign({
            id,
            key: 'video-ad-'+id,
            type: {key: AdsConst.ADS_TYPES.EVENT_VIDEO},
            provider: {id: this.providerId},
            enabled: true,
            replay: true,
            eventKey
        }, props);
    }

    loadSdk()
    {
        this.window.CrazyGames = {
            SDK: {
                getEnvironment: async () => this.environment,
                ad: {
                    hasAdblock: async () => this.answerAdblockCheck(),
                    requestAd: async (adType, callbacks) => this.requestedAds.push({adType, callbacks})
                }
            }
        };
        return this.window.CrazyGames.SDK;
    }

    answerAdblockCheck()
    {
        if(this.adblockCheckError){
            throw this.adblockCheckError;
        }
        return this.adblockDetected;
    }

    createGameManager()
    {
        return {
            gameDom: {getWindow: () => this.window},
            events: {on: (eventKey, callback) => this.listeners[eventKey] = callback},
            config: {
                get: () => this.adsCollection,
                getWithoutLogs: (path, defaultValue) => defaultValue
            },
            getFeature: () => this.adsPlugin,
            audioManager: {changeMuteState: async (muted, paused) => this.muteStates.push([muted, paused])},
            activeRoomEvents: {send: (message) => this.sentMessages.push(message)}
        };
    }

    createProvider(videoAds)
    {
        for(let videoAd of videoAds){
            this.adsCollection[videoAd.id] = videoAd;
        }
        return new CrazyGames({id: this.providerId}, this.createGameManager());
    }

    async captureTimeouts(callback)
    {
        let originalSetTimeout = global.setTimeout;
        global.setTimeout = (timeoutCallback, delayMs) => this.scheduledTimeouts.push({timeoutCallback, delayMs});
        let callbackResult = false;
        let callbackError = false;
        try {
            callbackResult = await callback();
        } catch (error) {
            callbackError = error;
        }
        global.setTimeout = originalSetTimeout;
        if(callbackError){
            throw callbackError;
        }
        return callbackResult;
    }

    async runScheduledTimeout(target, methodName)
    {
        let startedCalls = [];
        let originalMethod = target[methodName].bind(target);
        target[methodName] = (...args) => startedCalls.push(originalMethod(...args));
        this.scheduledTimeouts.shift().timeoutCallback();
        target[methodName] = originalMethod;
        return await Promise.all(startedCalls);
    }

}

module.exports.CrazyGamesProviderBuilder = CrazyGamesProviderBuilder;
