/**
 *
 * Reldens - Client Core Features
 *
 * All the core features plugins will be available here.
 * Later we can control if the feature is enabled/disabled using the configuration in the storage.
 * Core features will be available as part of the current Reldens version.
 *
 */

const { ChatPlugin } = require('../../chat/client/plugin');
const { ObjectsPlugin } = require('../../objects/client/plugin');
const { InventoryPlugin } = require('../../inventory/client/plugin');
const { ActionsPlugin } = require('../../actions/client/plugin');
const { UsersPlugin } = require('../../users/client/plugin');
const { AudioPlugin } = require('../../audio/client/plugin');
const { RoomsPlugin } = require('../../rooms/client/plugin');
const { PredictionPlugin } = require('../../prediction/client/plugin');
const { TeamsPlugin } = require('../../teams/client/plugin');

module.exports.ClientCoreFeatures = {
    chat: ChatPlugin,
    objects: ObjectsPlugin,
    inventory: InventoryPlugin,
    actions: ActionsPlugin,
    users: UsersPlugin,
    audio: AudioPlugin,
    rooms: RoomsPlugin,
    prediction: PredictionPlugin,
    teams: TeamsPlugin
};
