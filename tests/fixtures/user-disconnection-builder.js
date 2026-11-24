/**
 *
 * Reldens - UserDisconnectionBuilder
 *
 * Creates the UserDisconnection of a real LoginManager (its events listeners recorded by name, pass {} to ignore them,
 * its config answering the given values by path and the shared servers values built from them, with the self URL as
 * the default public URL) with a known signed tokens secret, an active players stub
 * answering the given user model for any username, no created rooms (so no user is settled in a scene here) and a
 * disconnection recording the disconnected usernames (built for
 * the self server URL with the given rooms servers, so the login manager gives it the other servers addresses), and
 * signs the disconnection tokens (server change and check only when asked) for the server of that UserDisconnection.
 *
 */

const { LoginManager } = require('../../lib/game/server/login-manager');
const { ExpiringHmacToken } = require('../../lib/game/server/expiring-hmac-token');
const { ServerMessengerPropsBuilder } = require('./server-messenger-props-builder');
const { sc } = require('@reldens/utils');

class UserDisconnectionBuilder
{

    static SECRET = 'test-secret';

    static EXPIRATION_MS = 60000;

    static SELF_URL = 'http://self:8080';

    /**
     * @param {Object<string, Function>} listeners
     * @param {Object<string, any>} [configValues]
     * @returns {LoginManager}
     */
    static createLoginManager(listeners, configValues = {})
    {
        return new LoginManager({
            config: {
                get: (path, defaultValue) => sc.get(configValues, path, defaultValue),
                getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)
            },
            events: {on: (eventName, callback) => listeners[eventName] = callback},
            serverToServerMessengerProps: ServerMessengerPropsBuilder.createShared(
                UserDisconnectionBuilder.SELF_URL,
                {},
                UserDisconnectionBuilder.SECRET,
                configValues
            )
        });
    }

    /**
     * @param {LoginManager} loginManager
     * @param {Object} userModel
     * @param {Array<string>} disconnectedUsers
     * @returns {UserDisconnection}
     */
    static create(loginManager, userModel, disconnectedUsers)
    {
        let userDisconnection = loginManager.userDisconnection;
        userDisconnection.expiringHmacToken = new ExpiringHmacToken({secret: UserDisconnectionBuilder.SECRET});
        userDisconnection.activePlayers = {fetchByUserNameInAnyRoom: () => ({userModel})};
        userDisconnection.roomsManager = {createdInstances: {}};
        userDisconnection.disconnectUserFromEveryRoom = async (disconnectedUserModel) => {
            disconnectedUsers.push(disconnectedUserModel.username);
            return true;
        };
        return userDisconnection;
    }

    /**
     * @param {Object} userModel
     * @param {Array<string>} disconnectedUsers
     * @param {Object<string, string>} [roomsServers]
     * @returns {UserDisconnection}
     */
    static createForServer(userModel, disconnectedUsers, roomsServers = {})
    {
        return UserDisconnectionBuilder.create(
            UserDisconnectionBuilder.createLoginManager(
                {},
                {'server/publicUrl': UserDisconnectionBuilder.SELF_URL, 'client/rooms/servers': roomsServers}
            ),
            userModel,
            disconnectedUsers
        );
    }

    /**
     * @param {UserDisconnection} userDisconnection
     * @param {string} username
     * @param {boolean} [isServerChange]
     * @param {boolean} [isCheckOnly]
     * @returns {string}
     */
    static createToken(userDisconnection, username, isServerChange = false, isCheckOnly = false)
    {
        return userDisconnection.expiringHmacToken.generate(
            userDisconnection.disconnectionTokenValues(
                [...userDisconnection.serverSelfAddresses].shift(),
                username,
                isServerChange,
                isCheckOnly
            ),
            Date.now()+UserDisconnectionBuilder.EXPIRATION_MS
        );
    }

}

module.exports.UserDisconnectionBuilder = UserDisconnectionBuilder;
