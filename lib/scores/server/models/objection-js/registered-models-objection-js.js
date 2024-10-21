/**
 *
 * Reldens - ScoresEntities
 *
 */

const { ScoresModel } = require('./scores-model');
const { ScoresDetailModel } = require('./scores-detail-model');
const { entitiesConfig } = require('../../entities-config');
const { entitiesTranslations } = require('../../entities-translations');

let rawRegisteredEntities = {
    scores: ScoresModel,
    scoresDetail: ScoresDetailModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
