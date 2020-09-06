/**
 *
 * Reldens - Client Core Features
 *
 * All the core features packages will be available here.
 * Later we can control if the feature is enable/disable using the configuration in the storage.
 * Core features will be available as part of the current Reldens version.
 *
 */

const { ChatPack } = require('../../chat/client/pack');
const { ObjectsPack } = require('../../objects/client/pack');
const { InventoryPack } = require('../../inventory/client/pack');
const { ActionsPack } = require('../../actions/client/pack');

module.exports.ClientCoreFeatures = {
    chat: ChatPack,
    objects: ObjectsPack,
    inventory: InventoryPack,
    actions: ActionsPack
};
