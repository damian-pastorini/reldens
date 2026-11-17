/**
 *
 * Reldens - Test Login Manager Disconnect
 *
 */

const { BaseTest } = require('./base-test');
const { LoginManager } = require('../lib/game/server/login-manager');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');
const { JsonResponseRecorder } = require('./fixtures/json-response-recorder');
const { GlobalFetchStub } = require('./fixtures/global-fetch-stub');
const { ActivePlayers } = require('../lib/game/server/memory/active-players');
const { sc } = require('@reldens/utils');
const { GameConst } = require('../lib/game/constants');

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
        userDisconnection.activePlayers = {fetchByUserNameInAnyRoom: () => ({userModel: this.victimUserModel})};
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
            let token = userDisconnection.expiringHmacToken.generate(
                [GameConst.ROUTE_PATHS.DISCONNECT_USER, 'attacker'],
                Date.now()+this.expirationMs
            );
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

    async testTheDisconnectRequestErrorAnswersAFailedResult()
    {
        await this.test('an error on the disconnect request answers a failed result instead of rejecting', async () => {
            let userDisconnection = this.createUserDisconnection([]);
            let loginManager = Object.create(LoginManager.prototype);
            loginManager.userDisconnection = userDisconnection;
            userDisconnection.disconnectUserByLoginData = async () => Promise.reject({message: 'Storage.'});
            let responses = [];
            await loginManager.handleDisconnectUserRequest({body: {}}, new JsonResponseRecorder().create(responses));
            this.assert.deepStrictEqual(responses, [500, {isSuccess: false}]);
        });
    }

    async testTheDisconnectRequestIsAbortedOnItsTimeout()
    {
        await this.test('the disconnect request carries the timeout signal and a timed out request lets the login continue', async () => {
            let userDisconnection = this.createUserDisconnection([]);
            let requests = [];
            let timedOutFetch = async (requestUrl, options) => {
                requests.push([requestUrl, options.signal instanceof AbortSignal, options.signal.aborted]);
                throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
            };
            let results = [];
            await GlobalFetchStub.withFetch(timedOutFetch, async () => {
                results.push(await userDisconnection.disconnectFromServer('http://server-a:8080', 'victim'));
            });
            this.assert.deepStrictEqual(
                [results, requests],
                [[true], [['http://server-a:8080'+GameConst.ROUTE_PATHS.DISCONNECT_USER, true, false]]]
            );
        });
    }

    async testTheUserIsDisconnectedWithAValidToken()
    {
        await this.test('the user is disconnected with a valid token signed by the shared secret', async () => {
            let disconnectedUsers = [];
            let userDisconnection = this.createUserDisconnection(disconnectedUsers);
            let token = this.createDisconnectionToken(userDisconnection, 'victim');
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: 'victim', token}});
            this.assert.strictEqual(result, true);
            this.assert.deepStrictEqual(disconnectedUsers, ['victim']);
        });
    }

    createDisconnectionToken(userDisconnection, username)
    {
        return userDisconnection.expiringHmacToken.generate(
            [GameConst.ROUTE_PATHS.DISCONNECT_USER, username],
            Date.now()+this.expirationMs
        );
    }

    async testADisconnectionTokenIsAcceptedOnceUntilItExpires()
    {
        await this.test('a disconnection token is accepted once, its replay is rejected and the expired used ones are dropped', async () => {
            let disconnectedUsers = [];
            let userDisconnection = this.createUserDisconnection(disconnectedUsers);
            userDisconnection.usedDisconnectionTokens = {'1.expired-used-token': 1};
            let token = this.createDisconnectionToken(userDisconnection, 'victim');
            let results = [];
            for(let attempt of [1, 2]){
                results.push(await userDisconnection.disconnectUserByLoginData({body: {username: 'victim', token, attempt}}));
            }
            this.assert.deepStrictEqual(
                [results, disconnectedUsers, Object.keys(userDisconnection.usedDisconnectionTokens)],
                [[true, false], ['victim'], [token]]
            );
        });
    }

    async testAUserOnlyInASceneRoomIsDisconnected()
    {
        await this.test('a user only in a scene room, with no game room session, is disconnected and an absent one is not', async () => {
            let results = [];
            let disconnectedUsers = [];
            let userDisconnection = this.createUserDisconnection(disconnectedUsers);
            let activePlayers = new ActivePlayers.constructor();
            activePlayers.gameRoomInstanceId = 'game-room';
            activePlayers.add({id: 7, username: 'victim', player: {id: 70, name: 'Victim'}}, {sessionId: 'town'}, {roomId: 'town-room'});
            userDisconnection.activePlayers = activePlayers;
            for(let username of ['victim', 'absent']){
                let token = this.createDisconnectionToken(userDisconnection, username);
                results.push(await userDisconnection.disconnectUserByLoginData({body: {username, token}}));
            }
            this.assert.deepStrictEqual([results, disconnectedUsers], [[true, true], ['victim']]);
        });
    }

    async testAServerStatusTokenIsNotADisconnectionToken()
    {
        await this.test('a server status token is not a disconnection token for a user named as the status value', async () => {
            let disconnectedUsers = [];
            let userDisconnection = this.createUserDisconnection(disconnectedUsers);
            let statusValue = GameConst.HEALTH.STATUS_TOKEN_VALUE;
            let token = userDisconnection.expiringHmacToken.generate([statusValue], Date.now()+this.expirationMs);
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: statusValue, token}});
            this.assert.deepStrictEqual([result, disconnectedUsers], [false, []]);
        });
    }

    async testTheDisconnectRequestTokenIsSignedForTheDisconnectRoute()
    {
        await this.test('the disconnect request token is signed for the disconnect route and the username only', async () => {
            let userDisconnection = this.createUserDisconnection([]);
            let sentTokens = [];
            let answeredFetch = async (requestUrl, options) => {
                sentTokens.push(sc.get(sc.parseJson(options.body), 'token', ''));
                return {ok: true, json: async () => ({isSuccess: true})};
            };
            let results = [];
            await GlobalFetchStub.withFetch(answeredFetch, async () => {
                results.push(await userDisconnection.disconnectFromServer('http://server-a:8080', 'victim'));
            });
            let sentToken = [...sentTokens].shift();
            let hmacToken = userDisconnection.expiringHmacToken;
            this.assert.deepStrictEqual(
                [
                    results,
                    hmacToken.validate([GameConst.ROUTE_PATHS.DISCONNECT_USER, 'victim'], sentToken, Date.now()),
                    hmacToken.validate(['victim'], sentToken, Date.now())
                ],
                [[true], true, false]
            );
        });
    }

}

module.exports.TestLoginManagerDisconnect = TestLoginManagerDisconnect;
