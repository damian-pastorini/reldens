/**
 *
 * Reldens - AdsConst
 *
 */

module.exports.AdsConst = {
    ENVIRONMENTS: {
        DISABLED: 'disabled'
    },
    ADS_TYPES: {
        EVENT_VIDEO: 'eventVideo',
        BANNER: 'banner'
    },
    ACTIONS: {
        ADS_PLAYED: 'adsP',
        AD_STARTED: 'adS',
        AD_ENDED: 'adE',
        AD_FAILED: 'adF',
    },
    MESSAGE: {
        DATA_VALUES: {
            NAMESPACE: 'ads'
        }
    },
    CONFIG_PATHS: {
        COLLECTION: 'server/ads/collection',
        VIDEOS_MAXIMUM_DURATION: 'server/ads/videoMaximumDuration',
        PROVIDERS: 'client/ads/general/providers',
        SDK_REQUIRED: 'client/ads/general/sdkRequired',
        SDK_CHECK_TIMEOUT: 'server/ads/sdkCheckTimeout',
        VIDEO_MINIMUM_DURATION: 'videoMinimumDuration'
    },
    SELECTORS: {
        SDK_ERROR: '.ads-sdk-error'
    },
    CLASSES: {
        HIDDEN_FORCED: 'hidden-forced'
    },
    PRIVATE_DATA: {
        REACTIVATION_TIMER: 'adsReactivationTimer'
    },
    AWAIT_ADS_TIME: 1000,
    VIDEOS_MINIMUM_DURATION: 3000,
    VIDEOS_MAXIMUM_DURATION: 60000,
    REPLAY_COOLDOWN: 60000,
    SDK_CHECK_TIMEOUT: 10000
};
