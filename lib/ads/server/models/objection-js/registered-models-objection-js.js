/**
 *
 * Reldens - Registered Entities
 *
 */

const { AdsModel } = require('./ads-model');
const { AdsProvidersModel } = require('./ads-providers-model');
const { AdsTypesModel } = require('./ads-types-model');
const { AdsBannerModel } = require('./ads-banner-model');
const { AdsEventVideoModel } = require('./ads-event-video-model');
const { AdsPlayedModel } = require('./ads-played-model');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    ads: AdsModel,
    adsTypes: AdsTypesModel,
    adsProviders: AdsProvidersModel,
    adsBanner: AdsBannerModel,
    adsEventVideo: AdsEventVideoModel,
    adsPlayed: AdsPlayedModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
