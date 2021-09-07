/**
 *
 * Reldens - Registered Entities
 *
 */

const { AudioCategoriesModel } = require('./audio-categories');
const { AudioMarkersModel } = require('./audio-markers');
const { AudioPlayerConfigModel } = require('./audio-player-config');
const { AudioFilesModel } = require('./audio-files');
const { AudioModel } = require('./model');
const { AudioEntity } = require('./entities/audio-entity');
const { AudioCategoriesEntity } = require('./entities/audio-categories-entity');
const { AudioMarkersEntity } = require('./entities/audio-markers-entity');
const { AudioPlayerConfigEntity } = require('./entities/audio-player-config-entity');
const { AudioFilesEntity } = require('./entities/audio-files-entity');

let entitiesTranslations = {
    labels: {
        audio: 'Audios',
        audio_categories: 'Categories',
        audio_markers: 'Markers',
        audio_player_config: 'Players Configuration',
        audio_files: 'Files'
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
    audioPlayerConfigModel: AudioPlayerConfigModel,
    audioFiles: AudioFilesModel
};

let entitiesConfig = (projectConfig) => { return {
    audio: AudioEntity.propertiesConfig(audioMenu),
    audioCategories: AudioCategoriesEntity.propertiesConfig(audioMenu),
    audioMarkers: AudioMarkersEntity.propertiesConfig(audioMenu),
    audioPlayerConfigModel: AudioPlayerConfigEntity.propertiesConfig(audioMenu),
    audioFiles: AudioFilesEntity.propertiesConfig(audioMenu, projectConfig)
}};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
