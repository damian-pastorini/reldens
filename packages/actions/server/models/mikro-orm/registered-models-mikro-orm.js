/**
 *
 * Reldens - Registered Models
 *
 */

const { ClassLevelUpAnimationsModel } = require('./class-level-up-animations-model');
const { rawRegisteredEntities } = require('@reldens/skills/lib/server/storage/models/mikro-orm/registered-models-mikro-orm');
const { entitiesConfig } = require('../../entiites-config');
const { entitiesTranslations } = require('../../entities-translations');

Object.assign(rawRegisteredEntities, {
    levelAnimations: ClassLevelUpAnimationsModel
});

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
