/**
 *
 * Reldens - Server Core Features
 *
 * All the core features plugins will be available here.
 * Later we can control if the feature is enabled/disabled using the configuration in the storage.
 * Core features will be available as part of the current Reldens version.
 *
 */

const { ActionsPlugin } = require('../../actions/server/plugin');
const { ChatPlugin } = require('../../chat/server/plugin');
const { RespawnPlugin } = require('../../respawn/server/plugin');
const { InventoryPlugin } = require('../../inventory/server/plugin');
const { FirebasePlugin } = require('../../firebase/server/plugin');
const { UsersPlugin } = require('../../users/server/plugin');
const { AudioPlugin } = require('../../audio/server/plugin');
const { RoomsPlugin } = require('../../rooms/server/plugin');
const { AdminPlugin } = require('../../admin/server/plugin');

module.exports.ServerCoreFeatures = {
    chat: ChatPlugin,
    respawn: RespawnPlugin,
    inventory: InventoryPlugin,
    firebase: FirebasePlugin,
    actions: ActionsPlugin,
    users: UsersPlugin,
    audio: AudioPlugin,
    rooms: RoomsPlugin,
    admin: AdminPlugin
};
