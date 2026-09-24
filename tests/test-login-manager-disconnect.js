/**
 *
 * Reldens - Test Login Manager Disconnect
 *
 */

const { BaseTest } = require('./base-test');
const { LoginManager } = require('../lib/game/server/login-manager');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');

class TestLoginManagerDisconnect extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.secret = 'test-secret';
        this.expirationMs = 60000;
        this.victimUserModel = {username: 'victim'};
    }

    createUserDisconnection(disconnectedUsers)
    {
        let loginManager = new LoginManager({
            config: {
                get: (path, defaultValue) => defaultValue,
                getWithoutLogs: (path, defaultValue) => defaultValue
            },
            events: {on: () => true}
        });
        let userDisconnection = loginManager.userDisconnection;
        userDisconnection.expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
        userDisconnection.activePlayers = {
            gameRoomInstanceId: 'game-room',
            fetchByRoomAndUserName: () => ({userModel: this.victimUserModel})
        };
        userDisconnection.disconnectUserFromEveryRoom = async (userModel) => {
            disconnectedUsers.push(userModel.username);
            return true;
        };
        return userDisconnection;
    }

    async testTheUserIsNotDisconnectedWithoutToken()
    {
        await this.test('the user is not disconnected when the request has no token', async () => {
            let disconnectedUsers = [];
            let userDisconnection = this.createUserDisconnection(disconnectedUsers);
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: 'victim'}});
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(disconnectedUsers.length, 0);
        });
    }

    async testTheUserIsNotDisconnectedWithATokenForAnotherUser()
    {
        await this.test('the user is not disconnected with a token generated for another username', async () => {
            let disconnectedUsers = [];
            let userDisconnection = this.createUserDisconnection(disconnectedUsers);
            let token = userDisconnection.expiringHmacToken.generate(['attacker'], Date.now()+this.expirationMs);
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: 'victim', token}});
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(disconnectedUsers.length, 0);
        });
    }

    createBroadcastDisconnection(requestedServers, isDisconnectConfirmed)
    {
        let userDisconnection = this.createUserDisconnection([]);
        userDisconnection.serverSelfUrl = 'http://self:8080';
        userDisconnection.roomsPerServer = userDisconnection.mapRoomsServers({
            town: 'http://server-a:8080',
            forest: 'http://self:8080'
        });
        userDisconnection.disconnectFromServer = async (serverUrl, username) => {
            requestedServers.push(serverUrl+'/'+username);
            return isDisconnectConfirmed;
        };
        return userDisconnection;
    }

    async testTheDisconnectionIsBroadcastToTheOtherServersOnly()
    {
        await this.test('the disconnection is broadcast only to the servers of the other rooms', async () => {
            let requestedServers = [];
            let userDisconnection = this.createBroadcastDisconnection(requestedServers, true);
            this.assert.strictEqual(await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel), true);
            this.assert.deepStrictEqual(requestedServers, ['http://server-a:8080/victim']);
        });
    }

    async testTheLoginIsRejectedWhenAnotherServerDoesNotDisconnect()
    {
        await this.test('the broadcast fails when another server does not confirm the disconnection', async () => {
            let userDisconnection = this.createBroadcastDisconnection([], false);
            this.assert.strictEqual(await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel), false);
        });
    }

    async testNothingIsBroadcastWhenTheServersDisconnectionIsDisabled()
    {
        await this.test('nothing is broadcast when the disconnection on server change is disabled', async () => {
            let requestedServers = [];
            let userDisconnection = this.createBroadcastDisconnection(requestedServers, false);
            userDisconnection.disconnectUsersOnServerChange = false;
            this.assert.strictEqual(await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel), true);
            this.assert.strictEqual(requestedServers.length, 0);
        });
    }

    async testTheUserIsDisconnectedWithAValidToken()
    {
        await this.test('the user is disconnected with a valid token signed by the shared secret', async () => {
            let disconnectedUsers = [];
            let userDisconnection = this.createUserDisconnection(disconnectedUsers);
            let token = userDisconnection.expiringHmacToken.generate(['victim'], Date.now()+this.expirationMs);
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: 'victim', token}});
            this.assert.strictEqual(result, true);
            this.assert.deepStrictEqual(disconnectedUsers, ['victim']);
        });
    }

}

module.exports.TestLoginManagerDisconnect = TestLoginManagerDisconnect;
