/**
 *
 * Reldens - Test Login Manager Disconnect
 *
 * Tests the disconnect messages a server receives: the message must be signed for the username, the action and this
 * server, it is accepted once, a check only message answers the logged user without disconnecting it, a signed message
 * of this same server instance is answered with no disconnection, and a failed disconnection answers a failed result
 * (an error a failed route answer). The messages sent to the other servers are tested in
 * TestUserDisconnectionBroadcast.
 *
 */

const { BaseTest } = require('./base-test');
const { UserDisconnectionBuilder } = require('./fixtures/user-disconnection-builder');
const { JsonResponseRecorder } = require('./fixtures/json-response-recorder');
const { ActivePlayers } = require('../lib/game/server/memory/active-players');
const { GameConst } = require('../lib/game/constants');

class TestLoginManagerDisconnect extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.victimUserModel = {username: 'victim'};
        this.rejected = {isSuccess: false};
    }

    async testTheUserIsNotDisconnectedWithoutAValidSignature()
    {
        await this.test('the user is not disconnected without token, for another username, action or with a status token', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, disconnectedUsers);
            let attackerBody = UserDisconnectionBuilder.createRequestBody(userDisconnection, 'attacker');
            let statusToken = userDisconnection.expiringHmacToken.generate(
                [GameConst.HEALTH.STATUS_TOKEN_VALUE],
                Date.now()+GameConst.SIGNED_TOKENS.SERVER_STATUS_EXPIRATION
            );
            let invalidBodies = [
                {targetId: 'victim', action: GameConst.DISCONNECTION.DISCONNECT},
                Object.assign({}, attackerBody, {targetId: 'victim'}),
                Object.assign({}, attackerBody, {action: GameConst.DISCONNECTION.SERVER_CHANGE}),
                Object.assign({}, attackerBody, {targetId: GameConst.HEALTH.STATUS_TOKEN_VALUE, token: statusToken})
            ];
            let results = [];
            for(let body of invalidBodies){
                results.push(await userDisconnection.receiveRequest({body}));
            }
            this.assert.deepStrictEqual(
                [results, disconnectedUsers],
                [new Array(invalidBodies.length).fill(this.rejected), []]
            );
        });
    }

    async testACheckOnlyRequestAnswersTheLoggedUserWithoutDisconnecting()
    {
        await this.test('a check only message is accepted once, answers the logged user and never disconnects it', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, disconnectedUsers);
            let body = UserDisconnectionBuilder.createRequestBody(
                userDisconnection,
                'victim',
                GameConst.DISCONNECTION.CHECK_ONLY
            );
            let answers = [
                await userDisconnection.receiveRequest({body}),
                await userDisconnection.receiveRequest({body}),
                await userDisconnection.receiveRequest({
                    body: Object.assign({}, body, {action: GameConst.DISCONNECTION.DISCONNECT})
                })
            ];
            this.assert.deepStrictEqual(
                [answers, disconnectedUsers],
                [[{isSuccess: true, wasLogged: true}, this.rejected, this.rejected], []]
            );
        });
    }

    async testTheDisconnectRequestErrorAnswersAFailedResult()
    {
        await this.test('an error on the disconnect message answers a failed result instead of rejecting', async () => {
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, []);
            userDisconnection.disconnectUserFromEveryRoom = async () => Promise.reject({message: 'Storage.'});
            let responses = [];
            await userDisconnection.handleRouteRequest(
                {body: UserDisconnectionBuilder.createRequestBody(userDisconnection, 'victim')},
                new JsonResponseRecorder().create(responses)
            );
            this.assert.deepStrictEqual(responses, [500, this.rejected]);
        });
    }

    async testTheUserIsDisconnectedWithAValidMessageOnce()
    {
        await this.test('a valid message disconnects the user once, its replay is rejected and the expired used ones are dropped', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, disconnectedUsers);
            userDisconnection.expiringHmacToken.usedTokens = {'1.expired-used-token': 1};
            let body = UserDisconnectionBuilder.createRequestBody(userDisconnection, 'victim');
            let results = [];
            for(let attempt of [1, 2]){
                results.push(await userDisconnection.receiveRequest({body: Object.assign({attempt}, body)}));
            }
            this.assert.deepStrictEqual(
                [results, disconnectedUsers, Object.keys(userDisconnection.expiringHmacToken.usedTokens)],
                [[{isSuccess: true, wasLogged: true}, this.rejected], ['victim'], [body.token]]
            );
        });
    }

    async testAUserOnlyInASceneRoomIsDisconnected()
    {
        await this.test('a user only in a scene room, with no game room session, is disconnected and an absent one is not', async () => {
            let results = [];
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, disconnectedUsers);
            let activePlayers = new ActivePlayers();
            activePlayers.gameRoomInstanceId = 'game-room';
            activePlayers.add({id: 7, username: 'victim', player: {id: 70, name: 'Victim'}}, {sessionId: 'town'}, {roomId: 'town-room'});
            userDisconnection.activePlayers = activePlayers;
            for(let username of ['victim', 'absent']){
                let body = UserDisconnectionBuilder.createRequestBody(userDisconnection, username);
                results.push(await userDisconnection.receiveRequest({body}));
            }
            this.assert.deepStrictEqual(
                [results, disconnectedUsers],
                [[{isSuccess: true, wasLogged: true}, {isSuccess: true, wasLogged: false}], ['victim']]
            );
        });
    }

    async testAFailedDisconnectionAnswersAFailedResult()
    {
        await this.test('a logged user without its user model or not disconnected from a room answers a failed result', async () => {
            let results = [];
            for(let activePlayer of [{userModel: false}, {userModel: this.victimUserModel}]){
                let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, []);
                userDisconnection.activePlayers = {fetchByUserNameInAnyRoom: () => activePlayer};
                userDisconnection.disconnectUserFromEveryRoom = async () => false;
                let body = UserDisconnectionBuilder.createRequestBody(userDisconnection, 'victim');
                results.push(await userDisconnection.receiveRequest({body}));
            }
            this.assert.deepStrictEqual(results, [{isSuccess: false, wasLogged: false}, {isSuccess: false, wasLogged: false}]);
        });
    }

    async testARequestOfThisSameServerIsAnsweredWithNoDisconnection()
    {
        await this.test('a disconnect message carrying this server instance ID is answered with no disconnection, also signed for a host alias (ISSUE #500)', async () => {
            let disconnectedUsers = [];
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, disconnectedUsers);
            let ownInstanceId = userDisconnection.serverInstanceId;
            let aliasUrl = 'http://127.0.0.1:8080';
            let disconnectAction = GameConst.DISCONNECTION.DISCONNECT;
            let bodies = [
                UserDisconnectionBuilder.createRequestBody(userDisconnection, 'victim', disconnectAction, ownInstanceId),
                userDisconnection.createRequestBody(aliasUrl, disconnectAction, 'victim', {senderInstanceId: ownInstanceId}),
                userDisconnection.createRequestBody(aliasUrl, disconnectAction, 'victim', {senderInstanceId: 'another'}),
                UserDisconnectionBuilder.createRequestBody(userDisconnection, 'victim', disconnectAction, '')
            ];
            let results = [];
            for(let body of bodies){
                results.push(await userDisconnection.receiveRequest({body}));
            }
            let otherInstanceId = UserDisconnectionBuilder.createForServer(this.victimUserModel, []).serverInstanceId;
            this.assert.deepStrictEqual(
                [results, disconnectedUsers, /^[\w-]{16,}$/.test(ownInstanceId), ownInstanceId === otherInstanceId],
                [
                    [
                        {isSuccess: true, wasLogged: false},
                        {isSuccess: true, wasLogged: false},
                        this.rejected,
                        {isSuccess: true, wasLogged: true}
                    ],
                    ['victim'],
                    true,
                    false
                ]
            );
        });
    }

}

module.exports.TestLoginManagerDisconnect = TestLoginManagerDisconnect;
