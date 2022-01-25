/**
 *
 * Reldens - Registered Entities
 *
 */

const { RespawnModel } = require('./respawn-model');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entiites-config');

let rawRegisteredEntities = {
    respawn: RespawnModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
