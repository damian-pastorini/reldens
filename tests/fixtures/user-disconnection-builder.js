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
 * signs the disconnect messages (a disconnection, a server change or a check only) another server instance sends to the
 * server of that UserDisconnection.
 *
 */

const { LoginManager } = require('../../lib/game/server/login-manager');
const { ExpiringHmacToken } = require('../../lib/game/server/expiring-hmac-token');
const { ServerMessengerPropsBuilder } = require('./server-messenger-props-builder');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class UserDisconnectionBuilder
{

    static SECRET = 'test-secret';

    static SELF_URL = 'http://self:8080';

    static OTHER_INSTANCE_ID = 'other-server-instance';

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
     * @param {string} [action]
     * @param {string} [senderInstanceId]
     * @returns {Object}
     */
    static createRequestBody(
        userDisconnection,
        username,
        action = GameConst.DISCONNECTION.DISCONNECT,
        senderInstanceId = UserDisconnectionBuilder.OTHER_INSTANCE_ID
    ){
        return userDisconnection.createRequestBody(
            [...userDisconnection.serverSelfAddresses].shift(),
            action,
            username,
            {senderInstanceId}
        );
    }

}

module.exports.UserDisconnectionBuilder = UserDisconnectionBuilder;
