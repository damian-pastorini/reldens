/**
 *
 * Reldens - Registered Models
 *
 */

const { SkillAnimationsModel } = require('./skill-animations-model');
const { ClassLevelUpAnimationsModel } = require('./class-level-up-animations-model');
const { rawRegisteredEntities } = require('@reldens/skills/lib/server/storage/models/objection-js/registered-models-objection-js');
const { entitiesConfig } = require('../../entiites-config');
const { entitiesTranslations } = require('../../entities-translations');

Object.assign(rawRegisteredEntities, {
    animations: SkillAnimationsModel,
    levelAnimations: ClassLevelUpAnimationsModel,
});

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
