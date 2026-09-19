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

    createLoginManager(disconnectedUsers)
    {
        let loginManager = new LoginManager({
            config: {
                get: (path, defaultValue) => defaultValue,
                getWithoutLogs: (path, defaultValue) => defaultValue
            },
            configServer: {publicUrl: 'http://localhost:8080'},
            events: {on: () => true}
        });
        loginManager.expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
        loginManager.activePlayers = {
            gameRoomInstanceId: 'game-room',
            fetchByRoomAndUserName: () => ({userModel: this.victimUserModel})
        };
        loginManager.disconnectUserFromEveryRoom = async (userModel) => {
            disconnectedUsers.push(userModel.username);
            return true;
        };
        return loginManager;
    }

    async testTheUserIsNotDisconnectedWithoutToken()
    {
        await this.test('the user is not disconnected when the request has no token', async () => {
            let disconnectedUsers = [];
            let loginManager = this.createLoginManager(disconnectedUsers);
            let result = await loginManager.disconnectUserByLoginData({body: {username: 'victim'}});
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(disconnectedUsers.length, 0);
        });
    }

    async testTheUserIsNotDisconnectedWithATokenForAnotherUser()
    {
        await this.test('the user is not disconnected with a token generated for another username', async () => {
            let disconnectedUsers = [];
            let loginManager = this.createLoginManager(disconnectedUsers);
            let token = loginManager.expiringHmacToken.generate(['attacker'], Date.now()+this.expirationMs);
            let result = await loginManager.disconnectUserByLoginData({body: {username: 'victim', token}});
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(disconnectedUsers.length, 0);
        });
    }

    async testTheUserIsDisconnectedWithAValidToken()
    {
        await this.test('the user is disconnected with a valid token signed by the shared secret', async () => {
            let disconnectedUsers = [];
            let loginManager = this.createLoginManager(disconnectedUsers);
            let token = loginManager.expiringHmacToken.generate(['victim'], Date.now()+this.expirationMs);
            let result = await loginManager.disconnectUserByLoginData({body: {username: 'victim', token}});
            this.assert.strictEqual(result, true);
            this.assert.deepStrictEqual(disconnectedUsers, ['victim']);
        });
    }

}

module.exports.TestLoginManagerDisconnect = TestLoginManagerDisconnect;
