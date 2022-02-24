/**
 *
 * Reldens - Registered Models
 *
 */

const { AudioCategoriesModel } = require('./audio-categories-model');
const { AudioMarkersModel } = require('./audio-markers-model');
const { AudioPlayerConfigModel } = require('./audio-player-config-model');
const { AudioModel } = require('./audio-model');
const { entitiesConfig } = require('../../entities-config');
const { entitiesTranslations } = require('../../entities-translations');

let rawRegisteredEntities = {
    audio: AudioModel,
    audioCategories: AudioCategoriesModel,
    audioMarkers: AudioMarkersModel,
    audioPlayerConfigModel: AudioPlayerConfigModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
