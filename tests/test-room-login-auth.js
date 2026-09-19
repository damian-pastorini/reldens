/**
 *
 * Reldens - Test Room Login Auth
 *
 */

const { BaseTest } = require('./base-test');
const { RoomLogin } = require('../lib/rooms/server/login');

class TestRoomLoginAuth extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.activeUserModel = {id: 1, username: 'victim', email: 'victim@reldens.com', related_players: []};
        this.request = {headers: {}};
    }

    createRoomLogin(loginResult, processedRequests)
    {
        let roomLogin = Object.create(RoomLogin.prototype, {
            roomName: {value: 'test-room'},
            roomId: {value: 'test-room-id'}
        });
        roomLogin.events = {emitSync: async () => true};
        roomLogin.loginManager = {
            processUserRequest: async (options) => {
                processedRequests.push(options);
                return loginResult;
            },
            activePlayers: {fetchByRoomAndUserName: () => ({userModel: this.activeUserModel})},
            broadcastDisconnectionMessage: async () => true
        };
        return roomLogin;
    }

    async testTheActiveUserIsRejectedWithoutValidPassword()
    {
        await this.test('an active username is rejected when the credentials are not valid', async () => {
            let processedRequests = [];
            let roomLogin = this.createRoomLogin({error: 'Login, invalid user data.'}, processedRequests);
            await this.assert.rejects(roomLogin.onAuth({}, {username: 'victim'}, this.request));
            this.assert.strictEqual(processedRequests.length, 1);
        });
    }

    async testTheAuthenticatedUserIsTheFreshlyLoadedUser()
    {
        await this.test('the authenticated user is the one loaded by the credentials validation', async () => {
            let loadedUser = {id: 1, username: 'victim', email: 'victim@reldens.com', related_players: []};
            let roomLogin = this.createRoomLogin({user: loadedUser}, []);
            let authResult = await roomLogin.onAuth({}, {username: 'victim', password: 'valid'}, this.request);
            this.assert.strictEqual(authResult, loadedUser);
        });
    }

    async testTheUncaughtExceptionIsNotRethrown()
    {
        await this.test('an uncaught room exception is logged and not rethrown', async () => {
            let roomLogin = this.createRoomLogin({error: 'unused'}, []);
            this.assert.doesNotThrow(() => roomLogin.onUncaughtException(new Error('Malformed message.'), 'onMessage'));
        });
    }

}

module.exports.TestRoomLoginAuth = TestRoomLoginAuth;
