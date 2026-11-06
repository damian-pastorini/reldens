/**
 *
 * Reldens - GameplayPlayerBuilder
 *
 * Builds the stubs the gameplay features use: a config with the given paths values, a real config manager loaded with
 * the given paths values, a player schema with its private data (read as the Player schema does, null for an empty
 * value), death and disabled states, an inventory manager over the given items (recording the decreased quantities and
 * the listened events) and a client recording the sent messages.
 *
 */

const { ConfigManager } = require('../../lib/config/server/manager');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class GameplayPlayerBuilder
{

    /**
     * @param {Object} values
     * @returns {Object}
     */
    static createConfig(values)
    {
        let config = {values};
        config.getWithoutLogs = (path, defaultValue) => sc.get(config.values, path, defaultValue);
        return config;
    }

    /**
     * @param {Object} values
     * @returns {ConfigManager}
     */
    static createConfigManager(values)
    {
        let configManager = new ConfigManager({});
        for(let path of Object.keys(values)){
            configManager.loopObjectAndAssignProperty(configManager.configList, path.split('/'), values[path]);
        }
        return Object.assign(configManager, configManager.configList);
    }

    /**
     * @param {Object} [props]
     * @returns {Object}
     */
    static createPlayerSchema(props = {})
    {
        let playerSchema = {
            player_id: sc.get(props, 'playerId', 7),
            sessionId: sc.get(props, 'sessionId', 'session-7'),
            avatarKey: sc.get(props, 'avatarKey', 'journeyman'),
            stats: sc.get(props, 'stats', {hp: 50}),
            statsBase: sc.get(props, 'statsBase', {hp: 100}),
            inState: sc.get(props, 'inState', GameConst.STATUS.ACTIVE),
            physicalBody: sc.get(props, 'physicalBody', {isChangingScene: false}),
            skillsServer: {classPath: {key: sc.get(props, 'classPathKey', 'journeyman')}},
            privateData: {}
        };
        playerSchema.getPrivate = (key) => playerSchema.privateData[key] || null;
        playerSchema.setPrivate = (key, value) => playerSchema.privateData[key] = value;
        playerSchema.isDeath = () => GameConst.STATUS.DEATH === playerSchema.inState;
        playerSchema.isDisabled = () => GameConst.STATUS.DISABLED === playerSchema.inState;
        return playerSchema;
    }

    /**
     * @param {Object} items
     * @returns {Object}
     */
    static createInventoryManager(items)
    {
        let inventoryManager = {items, decreasedItems: [], listenedEvents: {}};
        inventoryManager.findItemByKey = (itemKey) => Object.keys(inventoryManager.items).map(
            itemIndex => inventoryManager.items[itemIndex]
        ).find(item => itemKey === item.key) || false;
        inventoryManager.decreaseItemQty = async (inventoryId, qty) => {
            inventoryManager.decreasedItems.push({inventoryId, qty});
            inventoryManager.items[inventoryId].qty -= qty;
            return true;
        };
        inventoryManager.listenEvent = (eventName, callback) => inventoryManager.listenedEvents[eventName] = callback;
        inventoryManager.getOwnerUniqueEventKey = (suffix) => 'player-7-'+suffix;
        inventoryManager.getOwnerEventKey = () => 'player-7';
        return inventoryManager;
    }

    /**
     * @param {string} itemKey
     * @param {Object} [props]
     * @returns {Object}
     */
    static createItem(itemKey, props = {})
    {
        let item = Object.assign({key: itemKey, qty: 1, equipped: false, label: itemKey}, props);
        item.getInventoryId = () => itemKey;
        return item;
    }

    /**
     * @param {string} [sessionId]
     * @returns {Object}
     */
    static createClient(sessionId = 'session-7')
    {
        let client = {sessionId, sentMessages: []};
        client.send = (messageKey, message) => client.sentMessages.push(message);
        return client;
    }

}

module.exports.GameplayPlayerBuilder = GameplayPlayerBuilder;
