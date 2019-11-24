/**
 *
 * Reldens - Client Core Features
 *
 * All the core features packages will be available here.
 * Later we can control if the feature is enable/disable using the configuration in the storage.
 * Core features will be available as part of the current Reldens version.
 *
 */

module.exports.ClientCoreFeatures = {
    chat: require('../../chat/client/chat-pack-client'),
    objects: require('../../objects/client/objects-pack-client')
};
