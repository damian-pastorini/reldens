/**
 *
 * Reldens - Registered Entities
 *
 */

const { AudioEntityOverride } = require('./entities/audio-entity-override');
const { AudioCategoriesEntityOverride } = require('./entities/audio-categories-entity-override');

module.exports.entitiesConfig = {
    audio: AudioEntityOverride,
    audioCategories: AudioCategoriesEntityOverride
};
