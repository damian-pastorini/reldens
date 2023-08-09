/**
 *
 * Reldens - Entities Config
 *
 */

const { AdsEntity } = require('./entities/ads-entity');
const { AdsItemsEntity } = require('./entities/ads-items-entity');
const { AdsProvidersEntity } = require('./entities/ads-providers-entity');

let adsConfig = {
    parentItemLabel: 'Ads',
    icon: 'Box'
};

let entitiesConfig = (projectConfig) => { return {
    ads: AdsEntity.propertiesConfig(adsConfig),
    adsItems: AdsItemsEntity.propertiesConfig(adsConfig),
    adsProviders: AdsProvidersEntity.propertiesConfig(adsConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
