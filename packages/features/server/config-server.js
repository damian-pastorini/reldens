/**
 *
 * Reldens - Server Core Features
 *
 * All the core features packages will be available here.
 * Later we can control if the feature is enable/disable using the configuration in the storage.
 * Core features will be available as part of the current Reldens version.
 *
 */

module.exports.ServerCoreFeatures = {
    chat: require('../../chat/server/chat-pack-server')
};
