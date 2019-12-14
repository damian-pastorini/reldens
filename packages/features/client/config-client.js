/**
 *
 * Reldens - Client Core Features
 *
 * All the core features packages will be available here.
 * Later we can control if the feature is enable/disable using the configuration in the storage.
 * Core features will be available as part of the current Reldens version.
 *
 */

const { Chat } = require('../../chat/client/pack');
const { ObjectsPack } = require('../../objects/client/pack');

module.exports.ClientCoreFeatures = {
    chat: Chat,
    objects: ObjectsPack
};
