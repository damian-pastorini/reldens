/**
 *
 * Reldens - Entities Config
 *
 */

const { AdsEntity } = require('./entities/ads-entity');
const { AdsTypesEntity } = require('./entities/ads-types-entity');
const { AdsProvidersEntity } = require('./entities/ads-providers-entity');
const { AdsBannerEntity } = require('./entities/ads-banner-entity');
const { AdsVideoEventEntity } = require('./entities/ads-video-event-entity');

let adsConfig = {
    parentItemLabel: 'Ads',
    icon: 'Box'
};

let entitiesConfig = (projectConfig) => { return {
    ads: AdsEntity.propertiesConfig(adsConfig),
    adsTypes: AdsTypesEntity.propertiesConfig(adsConfig),
    adsProviders: AdsProvidersEntity.propertiesConfig(adsConfig),
    adsBanner: AdsBannerEntity.propertiesConfig(adsConfig),
    adsVideoEvent: AdsVideoEventEntity.propertiesConfig(adsConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
