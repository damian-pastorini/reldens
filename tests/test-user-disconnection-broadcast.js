/**
 *
 * Reldens - Test User Disconnection Broadcast
 *
 * Tests the disconnect messages a server sends to the other servers, which the login manager takes from the rooms
 * servers config (normalized and grouped by address, unparsable ones skipped, never the own server): a login asks
 * every other server to disconnect the user and fails when one does not confirm it; with the disconnection disabled a
 * login asks nothing and a server change only checks the user presence, where a server that fails the check counts as
 * not logged and the next servers are still checked (ISSUE #479), while with it enabled a failed server refuses the
 * server change (every server is still requested); a timed out or failed request refuses the login;
 * the answer keeps the logged user only from a success; and the message is valid only on its target server.
 *
 */

const { BaseTest } = require('./base-test');
const { UserDisconnectionBuilder } = require('./fixtures/user-disconnection-builder');
const { GlobalFetchStub } = require('./fixtures/global-fetch-stub');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestUserDisconnectionBroadcast extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.victimUserModel = {username: 'victim'};
        this.otherServerUrl = 'http://server-a:8080';
        this.roomsServers = {town: this.otherServerUrl, forest: UserDisconnectionBuilder.SELF_URL};
        this.failedAnswer = {isSuccess: false, wasLogged: false};
    }

    createBroadcastDisconnection(requestedServers, isDisconnectConfirmed, roomsServers = this.roomsServers)
    {
        let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, [], roomsServers);
        userDisconnection.sendRequest = async (serverUrl, action, username, payload) => {
            requestedServers.push({serverUrl, action, username, payload});
            return isDisconnectConfirmed ? {isSuccess: true, wasLogged: true} : false;
        };
        return userDisconnection;
    }

    async testTheDisconnectionIsBroadcastToTheOtherServersOnly()
    {
        await this.test('the disconnection is broadcast only to the servers of the other rooms with this server instance', async () => {
            let requestedServers = [];
            let userDisconnection = this.createBroadcastDisconnection(requestedServers, true);
            this.assert.deepStrictEqual(
                [await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel), requestedServers],
                [
                    {isSuccess: true, wasLogged: true},
                    [{
                        serverUrl: this.otherServerUrl,
                        action: GameConst.DISCONNECTION.DISCONNECT,
                        username: 'victim',
                        payload: {senderInstanceId: userDisconnection.serverInstanceId}
                    }]
                ]
            );
        });
    }

    async testTheLoginIsRejectedWhenAnotherServerDoesNotDisconnect()
    {
        await this.test('the broadcast fails when another server does not confirm the disconnection', async () => {
            let userDisconnection = this.createBroadcastDisconnection([], false);
            this.assert.deepStrictEqual(
                await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel),
                this.failedAnswer
            );
        });
    }

    async testTheDisabledDisconnectionOnlyChecksTheServerChange()
    {
        await this.test('with the disconnection disabled a login asks nothing and a server change only checks the user', async () => {
            let requestedServers = [];
            let userDisconnection = this.createBroadcastDisconnection(requestedServers, true);
            userDisconnection.disconnectUsersOnServerChange = false;
            let results = [
                await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel),
                await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel, true)
            ];
            this.assert.deepStrictEqual(
                [results, requestedServers.map(request => [request.serverUrl, request.action, request.username])],
                [
                    [{isSuccess: true, wasLogged: false}, {isSuccess: true, wasLogged: true}],
                    [[this.otherServerUrl, GameConst.DISCONNECTION.CHECK_ONLY, 'victim']]
                ]
            );
        });
    }

    async testAFailedServerCheckRefusesTheServerChangeOnlyWithTheDisconnectionEnabled()
    {
        await this.test('with the disconnection disabled a failed server check never refuses the server change, with it enabled it does after every server was requested', async () => {
            let secondServerUrl = 'http://server-b:8080';
            let loggedAnswer = {isSuccess: true, wasLogged: true};
            let results = [];
            for(let [disconnectUsersOnServerChange, serversAnswers] of [
                [false, [false, loggedAnswer]],
                [false, [loggedAnswer, false]],
                [false, [false, false]],
                [true, [false, loggedAnswer]]
            ]){
                let requestedServers = [];
                let userDisconnection = UserDisconnectionBuilder.createForServer(
                    this.victimUserModel,
                    [],
                    {town: this.otherServerUrl, lake: secondServerUrl, forest: UserDisconnectionBuilder.SELF_URL}
                );
                userDisconnection.disconnectUsersOnServerChange = disconnectUsersOnServerChange;
                userDisconnection.sendRequest = async (serverUrl) => {
                    requestedServers.push(serverUrl);
                    return serversAnswers[requestedServers.length - 1];
                };
                results.push([
                    await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel, true),
                    requestedServers
                ]);
            }
            let bothServers = [this.otherServerUrl, secondServerUrl];
            this.assert.deepStrictEqual(results, [
                [{isSuccess: true, wasLogged: true}, bothServers],
                [{isSuccess: true, wasLogged: true}, bothServers],
                [{isSuccess: true, wasLogged: false}, bothServers],
                [this.failedAnswer, bothServers]
            ]);
        });
    }

    async testTheRoomsServersAreGroupedByAddressAndTheCurrentServerIsNeverAsked()
    {
        await this.test('the rooms servers are grouped by address, unparsable ones skipped and the current server never asked', async () => {
            let requestedServers = [];
            let userDisconnection = this.createBroadcastDisconnection(requestedServers, true, {
                town: 'http://self:8080/', house: 'HTTP://SELF:8080', forest: 'ws://self:8080',
                cave: 'e2e not a server url', bots: 'http://server-a:8080/', lake: this.otherServerUrl
            });
            let broadcastResult = await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel);
            this.assert.deepStrictEqual(
                [userDisconnection.otherServersUrls, broadcastResult.isSuccess, requestedServers.map(request => request.serverUrl)],
                [[this.otherServerUrl], true, [this.otherServerUrl]]
            );
        });
    }

    async testTheDisconnectRequestIsAbortedOnItsTimeout()
    {
        await this.test('the disconnect message carries the timeout signal and a timed out or failed request refuses the login', async () => {
            let requestErrors = [
                new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
                new TypeError('fetch failed')
            ];
            let results = [];
            let requests = [];
            for(let requestError of requestErrors){
                let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, [], this.roomsServers);
                let failedFetch = async (requestUrl, options) => {
                    requests.push([requestUrl, options.signal instanceof AbortSignal, options.signal.aborted]);
                    return Promise.reject(requestError);
                };
                await GlobalFetchStub.withFetch(failedFetch, async () => {
                    results.push((await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel)).isSuccess);
                });
            }
            let expectedRequest = [this.otherServerUrl+GameConst.ROUTE_PATHS.DISCONNECT_USER, true, false];
            this.assert.deepStrictEqual([results, requests], [[false, false], [expectedRequest, expectedRequest]]);
        });
    }

    async testTheDisconnectRequestAnswerIsReadFromTheOtherServer()
    {
        await this.test('the disconnect result keeps the logged user only from a successful answer', async () => {
            let serverAnswers = [
                {isSuccess: true, wasLogged: true},
                {isSuccess: true, wasLogged: 'yes'},
                {isSuccess: false, wasLogged: true},
                {isSuccess: 'true'}
            ];
            let results = [];
            for(let serverAnswer of serverAnswers){
                let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, [], this.roomsServers);
                await GlobalFetchStub.withFetch(async () => ({ok: true, json: async () => serverAnswer}), async () => {
                    results.push(await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel, true));
                });
            }
            this.assert.deepStrictEqual(results, [
                {isSuccess: true, wasLogged: true},
                {isSuccess: true, wasLogged: false},
                this.failedAnswer,
                this.failedAnswer
            ]);
        });
    }

    async testTheDisconnectRequestIsOnlyValidOnItsTargetServer()
    {
        await this.test('the disconnect message is valid only on the server it was sent to', async () => {
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, [], this.roomsServers);
            let sentBodies = [];
            let answeredFetch = async (requestUrl, options) => {
                sentBodies.push(sc.parseJson(options.body));
                return {ok: true, json: async () => ({isSuccess: true})};
            };
            let results = [];
            await GlobalFetchStub.withFetch(answeredFetch, async () => {
                results.push((await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel)).isSuccess);
            });
            let body = [...sentBodies].shift();
            for(let receivingServerUrl of ['http://server-b:8080', 'http://server-a:8080/']){
                let receivingServer = UserDisconnectionBuilder.create(
                    UserDisconnectionBuilder.createLoginManager({}, {'server/publicUrl': receivingServerUrl}),
                    this.victimUserModel,
                    []
                );
                results.push((await receivingServer.receiveRequest({body})).isSuccess);
            }
            this.assert.deepStrictEqual(results, [true, false, true]);
        });
    }

}

module.exports.TestUserDisconnectionBroadcast = TestUserDisconnectionBroadcast;
