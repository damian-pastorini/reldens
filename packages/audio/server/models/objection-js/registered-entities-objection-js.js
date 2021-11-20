/**
 *
 * Reldens - Registered Entities
 *
 */

const { AudioCategoriesModel } = require('./audio-categories-model');
const { AudioMarkersModel } = require('./audio-markers-model');
const { AudioPlayerConfigModel } = require('./audio-player-config-model');
const { AudioModel } = require('./audio-model');
const { AudioEntity } = require('../../entities/audio-entity');
const { AudioCategoriesEntity } = require('../../entities/audio-categories-entity');
const { AudioMarkersEntity } = require('../../entities/audio-markers-entity');
const { AudioPlayerConfigEntity } = require('../../entities/audio-player-config-entity');

let entitiesTranslations = {
    labels: {
        audio: 'Audios',
        audio_categories: 'Categories',
        audio_markers: 'Markers',
        audio_player_config: 'Players Configuration'
    }
};

let audioMenu = {
    parentItemLabel: 'Audio',
    icon: 'Music'
};

let rawRegisteredEntities = {
    audio: AudioModel,
    audioCategories: AudioCategoriesModel,
    audioMarkers: AudioMarkersModel,
    audioPlayerConfigModel: AudioPlayerConfigModel
};

let entitiesConfig = (projectConfig) => { return {
    audio: AudioEntity.propertiesConfig(audioMenu, projectConfig),
    audioCategories: AudioCategoriesEntity.propertiesConfig(audioMenu),
    audioMarkers: AudioMarkersEntity.propertiesConfig(audioMenu),
    audioPlayerConfigModel: AudioPlayerConfigEntity.propertiesConfig(audioMenu)
}};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
