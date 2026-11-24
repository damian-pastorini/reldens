/**
 *
 * Reldens - Test User Disconnection Broadcast
 *
 * Tests the disconnect requests a server sends to the other servers, which the login manager takes from the rooms
 * servers config (normalized and grouped by address, unparsable ones skipped, never the own server): a login asks
 * every other server to disconnect the user and fails when one does not confirm it; with the disconnection disabled a
 * login asks nothing and a server change only checks the user presence, where a server that fails the check counts as
 * not logged and the next servers are still checked (ISSUE #479), while with it enabled a failed server refuses the
 * server change; a timed out or failed request refuses the login; the answer keeps the logged user only from a success;
 * and the request token is valid only on its target server.
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
    }

    createBroadcastDisconnection(requestedServers, isDisconnectConfirmed, roomsServers = this.roomsServers)
    {
        let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, [], roomsServers);
        userDisconnection.disconnectFromServer = async (serverUrl, username, isServerChange, isCheckOnly) => {
            requestedServers.push({serverUrl, username, isServerChange, isCheckOnly});
            return {isSuccess: isDisconnectConfirmed, wasLogged: isDisconnectConfirmed};
        };
        return userDisconnection;
    }

    async testTheDisconnectionIsBroadcastToTheOtherServersOnly()
    {
        await this.test('the disconnection is broadcast only to the servers of the other rooms', async () => {
            let requestedServers = [];
            let userDisconnection = this.createBroadcastDisconnection(requestedServers, true);
            this.assert.deepStrictEqual(
                [await userDisconnection.broadcastDisconnectionMessage(this.victimUserModel), requestedServers],
                [
                    {isSuccess: true, wasLogged: true},
                    [{serverUrl: this.otherServerUrl, username: 'victim', isServerChange: false, isCheckOnly: false}]
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
                {isSuccess: false, wasLogged: false}
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
                [results, requestedServers],
                [
                    [{isSuccess: true, wasLogged: false}, {isSuccess: true, wasLogged: true}],
                    [{serverUrl: this.otherServerUrl, username: 'victim', isServerChange: true, isCheckOnly: true}]
                ]
            );
        });
    }

    async testAFailedServerCheckRefusesTheServerChangeOnlyWithTheDisconnectionEnabled()
    {
        await this.test('with the disconnection disabled a failed server check never refuses the server change, with it enabled it does', async () => {
            let secondServerUrl = 'http://server-b:8080';
            let failedAnswer = {isSuccess: false, wasLogged: false};
            let loggedAnswer = {isSuccess: true, wasLogged: true};
            let results = [];
            for(let [disconnectUsersOnServerChange, serversAnswers] of [
                [false, [failedAnswer, loggedAnswer]],
                [false, [loggedAnswer, failedAnswer]],
                [false, [failedAnswer, failedAnswer]],
                [true, [failedAnswer, loggedAnswer]]
            ]){
                let requestedServers = [];
                let userDisconnection = UserDisconnectionBuilder.createForServer(
                    this.victimUserModel,
                    [],
                    {town: this.otherServerUrl, lake: secondServerUrl, forest: UserDisconnectionBuilder.SELF_URL}
                );
                userDisconnection.disconnectUsersOnServerChange = disconnectUsersOnServerChange;
                userDisconnection.disconnectFromServer = async (serverUrl) => {
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
                [failedAnswer, [this.otherServerUrl]]
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
        await this.test('the disconnect request carries the timeout signal and a timed out or failed request refuses the login', async () => {
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
        await this.test('the disconnect request result keeps the logged user only from a successful answer', async () => {
            let serverAnswers = [{isSuccess: true, wasLogged: true}, {isSuccess: false, wasLogged: true}, {isSuccess: 'true'}];
            let results = [];
            for(let serverAnswer of serverAnswers){
                let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, []);
                await GlobalFetchStub.withFetch(async () => ({ok: true, json: async () => serverAnswer}), async () => {
                    results.push(await userDisconnection.disconnectFromServer(this.otherServerUrl, 'victim', true, false));
                });
            }
            this.assert.deepStrictEqual(results, [
                {isSuccess: true, wasLogged: true},
                {isSuccess: false, wasLogged: false},
                {isSuccess: false, wasLogged: false}
            ]);
        });
    }

    async testTheDisconnectRequestTokenIsOnlyValidOnItsTargetServer()
    {
        await this.test('the disconnect request token is valid only on the server it was sent to', async () => {
            let userDisconnection = UserDisconnectionBuilder.createForServer(this.victimUserModel, []);
            let sentTokens = [];
            let answeredFetch = async (requestUrl, options) => {
                sentTokens.push(sc.get(sc.parseJson(options.body), 'token', ''));
                return {ok: true, json: async () => ({isSuccess: true})};
            };
            let results = [];
            await GlobalFetchStub.withFetch(answeredFetch, async () => {
                results.push((await userDisconnection.disconnectFromServer(this.otherServerUrl, 'victim', false, false)).isSuccess);
            });
            let token = [...sentTokens].shift();
            for(let receivingServerUrl of ['http://server-b:8080', 'http://server-a:8080/']){
                let receivingServer = UserDisconnectionBuilder.create(
                    UserDisconnectionBuilder.createLoginManager({}, {'server/publicUrl': receivingServerUrl}),
                    this.victimUserModel,
                    []
                );
                results.push(await receivingServer.disconnectUserByLoginData({body: {username: 'victim', token}}));
            }
            this.assert.deepStrictEqual(results, [true, false, true]);
        });
    }

}

module.exports.TestUserDisconnectionBroadcast = TestUserDisconnectionBroadcast;
