/**
 *
 * Reldens - Registered Entities
 *
 */

const { AudioEntity } = require('./entities/audio-entity');
const { AudioCategoriesEntity } = require('./entities/audio-categories-entity');
const { AudioMarkersEntity } = require('./entities/audio-markers-entity');
const { AudioPlayerConfigEntity } = require('./entities/audio-player-config-entity');

let audioMenu = {parentItemLabel: 'Audio'};

let entitiesConfig = (projectConfig) => { return {
    audio: AudioEntity.propertiesConfig(audioMenu, projectConfig),
    audioCategories: AudioCategoriesEntity.propertiesConfig(audioMenu),
    audioMarkers: AudioMarkersEntity.propertiesConfig(audioMenu),
    audioPlayerConfigModel: AudioPlayerConfigEntity.propertiesConfig(audioMenu)
}};

module.exports.entitiesConfig = entitiesConfig;
