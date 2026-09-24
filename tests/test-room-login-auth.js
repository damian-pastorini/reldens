/**
 *
 * Reldens - Test Room Login Auth
 *
 */

const { BaseTest } = require('./base-test');
const { RoomLogin } = require('../lib/rooms/server/login');
const { RoomsConst } = require('../lib/rooms/constants');
const { LoginAttempts } = require('../lib/game/server/memory/login-attempts');

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
        roomLogin.roomType = RoomsConst.ROOM_TYPE_SCENE;
        roomLogin.roomsLoginWindowMs = 60000;
        roomLogin.roomsLoginMaxJoins = 2;
        roomLogin.events = {emitSync: async () => true};
        roomLogin.loginManager = {
            processUserRequest: async (options) => {
                processedRequests.push(options);
                return loginResult;
            },
            loginAttempts: new LoginAttempts({}),
            activePlayers: {fetchByRoomAndUserName: () => ({userModel: this.activeUserModel})},
            userDisconnection: {broadcastDisconnectionMessage: async () => true}
        };
        return roomLogin;
    }

    async joinSceneRepeatedly(roomLogin, joinsData)
    {
        let joinResults = [];
        for(let joinData of joinsData){
            joinResults.push(await roomLogin.onAuth(
                {},
                {username: joinData.username, password: 'valid'},
                {ip: joinData.address, headers: {}}
            ).then(() => true).catch(() => false));
        }
        return joinResults;
    }

    async testTheThirdSceneJoinWithTheSameUsernameIsLimited()
    {
        await this.test('the scene joins above the limit are rejected for fixed and rotating addresses', async () => {
            let loadedUser = {id: 1, username: 'victim', email: 'victim@reldens.com', related_players: []};
            let fixedAddressJoins = await this.joinSceneRepeatedly(this.createRoomLogin({user: loadedUser}, []), [
                {username: 'user-1', address: '10.0.0.1'},
                {username: 'user-2', address: '10.0.0.1'},
                {username: 'user-3', address: '10.0.0.1'}
            ]);
            let processedRequests = [];
            let rotatingAddressRoom = this.createRoomLogin({user: loadedUser}, processedRequests);
            let rotatingAddressJoins = await this.joinSceneRepeatedly(rotatingAddressRoom, [
                {username: 'victim', address: '10.0.1.1'},
                {username: 'victim', address: '10.0.1.2'},
                {username: 'victim', address: '10.0.1.3'}
            ]);
            this.assert.deepStrictEqual(fixedAddressJoins, [true, true, false]);
            this.assert.deepStrictEqual(rotatingAddressJoins, [true, true, false]);
            this.assert.strictEqual(processedRequests.length, 2);
        });
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

    isValidOrigin(allowRequestsWithoutOrigin, requestHeaders)
    {
        let roomLogin = Object.create(RoomLogin.prototype);
        roomLogin.validateRoomsOriginRequest = true;
        roomLogin.allowRequestsWithoutOrigin = allowRequestsWithoutOrigin;
        roomLogin.allowedOrigins = ['http://localhost:8080'];
        return roomLogin.isValidOriginRequest({headers: requestHeaders});
    }

    async testTheAllowedOriginWithATrailingSlashIsAccepted()
    {
        await this.test('an allowed origin sent with a trailing slash passes the rooms origin validation', async () => {
            let requestHeaders = {get: (headerName) => 'origin' === headerName ? 'http://localhost:8080/' : null};
            this.assert.strictEqual(this.isValidOrigin(false, requestHeaders), true);
        });
    }

    async testTheForeignOriginIsRejected()
    {
        await this.test('an origin that is not in the allowed origins is rejected', async () => {
            let requestHeaders = {get: (headerName) => 'origin' === headerName ? 'http://attacker.test' : null};
            this.assert.strictEqual(this.isValidOrigin(true, requestHeaders), false);
        });
    }

    async testTheRequestWithoutOriginFollowsTheConfiguration()
    {
        await this.test('a request without origin follows the requests without origin configuration', async () => {
            let requestHeaders = {get: () => null};
            this.assert.strictEqual(this.isValidOrigin(true, requestHeaders), true);
            this.assert.strictEqual(this.isValidOrigin(false, requestHeaders), false);
        });
    }

    async testTheHeadersWithoutTheGetMethodAreHandledWithoutOrigin()
    {
        await this.test('headers without the get method are handled as a request without origin', async () => {
            let requestHeaders = {origin: 'http://localhost:8080'};
            this.assert.strictEqual(this.isValidOrigin(true, requestHeaders), true);
            this.assert.strictEqual(this.isValidOrigin(false, requestHeaders), false);
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
