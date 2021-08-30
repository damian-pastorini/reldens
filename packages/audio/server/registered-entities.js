/**
 *
 * Reldens - AudioEntities
 *
 */

const { AudioCategoriesModel } = require('./audio-categories');
const { AudioMarkersModel } = require('./audio-markers');
const { AudioPlayerConfigModel } = require('./audio-player-config');
const { AudioModel } = require('./model');

let rawRegisteredEntities = {
    audio: AudioModel,
    audioCategories: AudioCategoriesModel,
    audioMarkers: AudioMarkersModel,
    AudioPlayerConfigModel: AudioPlayerConfigModel
};

let parentItemLabel = 'Audio';
let icon = 'Music';

let entitiesConfig = {
    audio: {
        parentItemLabel,
        icon,
        listProperties: ['id'],
        showProperties: ['id'],
        filterProperties: ['id'],
        // editProperties: [],
        properties: {
            id: {}
        }
    }
};

module.exports.entitiesConfig = entitiesConfig;

module.exports.rawRegisteredEntities = rawRegisteredEntities;
