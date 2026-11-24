/**
 *
 * Reldens - ServerMessengerPropsBuilder
 *
 * Builds the signed server to server messenger props of a test server as the chat, rooms and teams plugins do it: the
 * shared ServerToServerMessengerProps instance created by ServerManagersInitializer.createServerToServerMessengerProps
 * over a config with the given public URL, rooms servers and signed tokens secret (plus any other given config values,
 * like the base URL), spread with the route path, so every server of a cross server test gets its own address and the
 * other servers addresses.
 *
 */

const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { ServerManagersInitializer } = require('../../lib/game/server/server-managers-initializer');

class ServerMessengerPropsBuilder
{

    /**
     * @param {string} serverSelfUrl
     * @param {Object<string, string>} roomsServers
     * @param {string} secret
     * @param {Object<string, any>} [configValues]
     * @returns {ServerToServerMessengerProps}
     */
    static createShared(serverSelfUrl, roomsServers, secret, configValues = {})
    {
        return new ServerManagersInitializer({
            configManager: GameplayPlayerBuilder.createConfigManager(Object.assign({
                'server/publicUrl': serverSelfUrl,
                'client/rooms/servers': roomsServers,
                'server/security/signedTokensSecret': secret
            }, configValues))
        }).createServerToServerMessengerProps();
    }

    /**
     * @param {string} serverSelfUrl
     * @param {Object<string, string>} roomsServers
     * @param {string} secret
     * @param {string} routePath
     * @returns {Object}
     */
    static create(serverSelfUrl, roomsServers, secret, routePath)
    {
        return Object.assign(
            {routePath},
            ServerMessengerPropsBuilder.createShared(serverSelfUrl, roomsServers, secret)
        );
    }

}

module.exports.ServerMessengerPropsBuilder = ServerMessengerPropsBuilder;
