/**
 *
 * Reldens - Entities Config
 *
 */

const { AdsEntity } = require('./entities/ads-entity');
const { AdsTypesEntity } = require('./entities/ads-types-entity');
const { AdsProvidersEntity } = require('./entities/ads-providers-entity');
const { AdsBannerEntity } = require('./entities/ads-banner-entity');
const { AdsEventVideoEntity } = require('./entities/ads-event-video-entity');
const { AdsPlayedEntity } = require('./entities/ads-played-entity');

let adsConfig = {parentItemLabel: 'Ads'};

let entitiesConfig = (projectConfig) => { return {
    ads: AdsEntity.propertiesConfig(adsConfig),
    adsTypes: AdsTypesEntity.propertiesConfig(adsConfig),
    adsProviders: AdsProvidersEntity.propertiesConfig(adsConfig),
    adsBanner: AdsBannerEntity.propertiesConfig(adsConfig),
    adsEventVideo: AdsEventVideoEntity.propertiesConfig(adsConfig),
    adsPlayed: AdsPlayedEntity.propertiesConfig(adsConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
