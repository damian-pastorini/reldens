/**
 *
 * Reldens - Test Login Manager Disconnect
 *
 * Tests the disconnect requests a server receives: the token must be valid for the username, the request kind and this
 * server, it is accepted once, a check only request answers the logged user without disconnecting it, a request of
 * this same server instance is answered with no disconnection, and a failed request answers a failed result. The
 * requests sent to the other servers are tested in TestUserDisconnectionBroadcast.
 *
 */

const { BaseTest } = require('./base-test');
const { LoginManager } = require('../lib/game/server/login-manager');
const { UserDisconnectionBuilder } = require('./fixtures/user-disconnection-builder');
const { JsonResponseRecorder } = require('./fixtures/json-response-recorder');
const { ActivePlayers } = require('../lib/game/server/memory/active-players');
const { GameConst } = require('../lib/game/constants');

class TestLoginManagerDisconnect extends BaseTest
{

    createDisconnectionToken = UserDisconnectionBuilder.createToken;

    constructor(config)
    {
        super(config);
        this.expirationMs = UserDisconnectionBuilder.EXPIRATION_MS;
        this.victimUserModel = {username: 'victim'};
    }

    async testTheUserIsNotDisconnectedWithoutToken()
    {
        await this.test('the user is not disconnected when the request has no token', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: 'victim'}});
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(disconnectedUsers.length, 0);
        });
    }

    async testTheUserIsNotDisconnectedWithATokenForAnotherUser()
    {
        await this.test('the user is not disconnected with a token generated for another username', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
            let token = userDisconnection.expiringHmacToken.generate(
                [GameConst.ROUTE_PATHS.DISCONNECT_USER, 'attacker'],
                Date.now()+this.expirationMs
            );
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: 'victim', token}});
            this.assert.strictEqual(result, false);
            this.assert.strictEqual(disconnectedUsers.length, 0);
        });
    }

    async testACheckOnlyRequestAnswersTheLoggedUserWithoutDisconnecting()
    {
        await this.test('a check only request is accepted once, answers the logged user and never disconnects it', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
            let checkToken = this.createDisconnectionToken(userDisconnection, 'victim', true, true);
            let body = {username: 'victim', token: checkToken, isServerChange: true, isCheckOnly: true};
            let answers = [
                await userDisconnection.answerDisconnectRequest({body}),
                await userDisconnection.answerDisconnectRequest({body}),
                await userDisconnection.answerDisconnectRequest({body: Object.assign({}, body, {isCheckOnly: false})})
            ];
            this.assert.deepStrictEqual(
                [answers, disconnectedUsers],
                [
                    [{isSuccess: true, wasLogged: true}, {isSuccess: false, wasLogged: false}, {isSuccess: false, wasLogged: false}],
                    []
                ]
            );
        });
    }

    async testTheDisconnectRequestErrorAnswersAFailedResult()
    {
        await this.test('an error on the disconnect request answers a failed result instead of rejecting', async () => {
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,[]);
            let loginManager = Object.create(LoginManager.prototype);
            loginManager.userDisconnection = userDisconnection;
            userDisconnection.disconnectUserByLoginData = async () => Promise.reject({message: 'Storage.'});
            let responses = [];
            await loginManager.handleDisconnectUserRequest({body: {}}, new JsonResponseRecorder().create(responses));
            this.assert.deepStrictEqual(responses, [500, {isSuccess: false}]);
        });
    }

    async testTheUserIsDisconnectedWithAValidToken()
    {
        await this.test('the user is disconnected with a valid token signed by the shared secret', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
            let token = this.createDisconnectionToken(userDisconnection, 'victim');
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: 'victim', token}});
            this.assert.strictEqual(result, true);
            this.assert.deepStrictEqual(disconnectedUsers, ['victim']);
        });
    }

    async testADisconnectionTokenIsAcceptedOnceUntilItExpires()
    {
        await this.test('a disconnection token is accepted once, its replay is rejected and the expired used ones are dropped', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
            userDisconnection.expiringHmacToken.usedTokens = {'1.expired-used-token': 1};
            let token = this.createDisconnectionToken(userDisconnection, 'victim');
            let results = [];
            for(let attempt of [1, 2]){
                results.push(await userDisconnection.disconnectUserByLoginData({body: {username: 'victim', token, attempt}}));
            }
            this.assert.deepStrictEqual(
                [results, disconnectedUsers, Object.keys(userDisconnection.expiringHmacToken.usedTokens)],
                [[true, false], ['victim'], [token]]
            );
        });
    }

    async testAUserOnlyInASceneRoomIsDisconnected()
    {
        await this.test('a user only in a scene room, with no game room session, is disconnected and an absent one is not', async () => {
            let results = [];
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
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

    async testTheDisconnectAnswerSaysTheUserWasLoggedOnlyWithAValidToken()
    {
        await this.test('the disconnect answer says the user was logged only for a valid token and a logged user', async () => {
            let answers = [];
            for(let answerCase of [{username: 'victim', isLogged: true}, {username: 'absent', isLogged: false}]){
                let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,[]);
                userDisconnection.activePlayers = {
                    fetchByUserNameInAnyRoom: () => answerCase.isLogged ? {userModel: this.victimUserModel} : false
                };
                let token = this.createDisconnectionToken(userDisconnection, answerCase.username);
                answers.push(await userDisconnection.answerDisconnectRequest({body: {username: answerCase.username, token}}));
                answers.push(await userDisconnection.answerDisconnectRequest({body: {username: answerCase.username}}));
            }
            this.assert.deepStrictEqual(answers, [
                {isSuccess: true, wasLogged: true},
                {isSuccess: false, wasLogged: false},
                {isSuccess: true, wasLogged: false},
                {isSuccess: false, wasLogged: false}
            ]);
        });
    }

    async testARequestOfThisSameServerIsAnsweredWithNoDisconnection()
    {
        await this.test('a disconnect request carrying this server instance ID is answered with no disconnection', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
            let ownInstanceId = userDisconnection.serverInstanceId;
            let results = [];
            for(let senderInstanceId of [ownInstanceId, 'another-instance', '']){
                results.push(await userDisconnection.answerDisconnectRequest({
                    body: {username: 'victim', token: '1.not-valid-here', senderInstanceId}
                }));
            }
            results.push(await userDisconnection.disconnectUserByLoginData({
                body: {username: 'victim', token: '1.not-valid-here', senderInstanceId: ownInstanceId}
            }));
            let otherInstanceId = UserDisconnectionBuilder.createForServer(this.victimUserModel,[]).serverInstanceId;
            this.assert.deepStrictEqual(
                [results, disconnectedUsers, /^[\w-]{16,}$/.test(ownInstanceId), ownInstanceId === otherInstanceId],
                [
                    [
                        {isSuccess: true, wasLogged: false},
                        {isSuccess: false, wasLogged: false},
                        {isSuccess: false, wasLogged: false},
                        false
                    ],
                    [],
                    true,
                    false
                ]
            );
        });
    }

    async testAServerStatusTokenIsNotADisconnectionToken()
    {
        await this.test('a server status token is not a disconnection token for a user named as the status value', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel,disconnectedUsers);
            let statusValue = GameConst.HEALTH.STATUS_TOKEN_VALUE;
            let token = userDisconnection.expiringHmacToken.generate([statusValue], Date.now()+this.expirationMs);
            let result = await userDisconnection.disconnectUserByLoginData({body: {username: statusValue, token}});
            this.assert.deepStrictEqual([result, disconnectedUsers], [false, []]);
        });
    }

}

module.exports.TestLoginManagerDisconnect = TestLoginManagerDisconnect;
