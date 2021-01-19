/**
 *
 * Reldens - Server Core Features
 *
 * All the core features packages will be available here.
 * Later we can control if the feature is enable/disable using the configuration in the storage.
 * Core features will be available as part of the current Reldens version.
 *
 */

const { ActionsPack } = require('../../actions/server/pack');
const { ChatPack } = require('../../chat/server/pack');
const { RespawnPack } = require('../../respawn/server/pack');
const { InventoryPack } = require('../../inventory/server/pack');
const { FirebasePack } = require('../../firebase/server/pack');
const { UsersPack } = require('../../users/server/pack');

module.exports.ServerCoreFeatures = {
    chat: ChatPack,
    respawn: RespawnPack,
    inventory: InventoryPack,
    firebase: FirebasePack,
    actions: ActionsPack,
    users: UsersPack
};
