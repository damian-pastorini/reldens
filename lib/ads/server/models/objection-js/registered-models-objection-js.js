/**
 *
 * Reldens - Registered Entities
 *
 */

const { AdsModel } = require('./ads-model');
const { AdsProvidersModel } = require('./ads-providers-model');
const { AdsItemsModel } = require('./ads-items-model');

const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    ads: AdsModel,
    adsItems: AdsItemsModel,
    adsProviders: AdsProvidersModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
