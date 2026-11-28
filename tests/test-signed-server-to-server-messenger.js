/**
 *
 * Reldens - Test Signed Server To Server Messenger
 *
 * Tests the SignedServerToServerMessenger built with the props the plugins get from the config: the other servers
 * addresses are normalized and deduplicated, never the own server, and an unparsable room server is skipped (with an
 * unparsable public URL the own address is empty); a room maps only to the address of another server; a signed request
 * reaches the other server once with a new nonce on every message and its replay is rejected; a modified or incomplete
 * request, one signed for another server or received by a server without own address is rejected and never marks the
 * token used, while one signed for the public or the base URL of the receiving server is accepted; an error on the
 * received action answers a failed route result; the received action answer is returned as is and only a success
 * answer counts as sent; a failed status, a rejected fetch or a missing secret send nothing; and the servers are sent
 * in parallel with their own results.
 *
 */

const { BaseTest } = require('./base-test');
const { SignedServerToServerMessenger } = require('../lib/game/server/signed-server-to-server-messenger');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { GlobalFetchStub } = require('./fixtures/global-fetch-stub');
const { JsonResponseRecorder } = require('./fixtures/json-response-recorder');
const { sc } = require('@reldens/utils');

class TestSignedServerToServerMessenger extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.firstServerUrl = 'http://server-1:8080';
        this.secondServerUrl = 'http://server-2:8081';
        this.roomsServers = {
            town: this.firstServerUrl,
            house: 'ws://server-2:8081/',
            forest: this.secondServerUrl,
            broken: 'not a url'
        };
        this.routePath = '/reldens-test-sync';
        this.rejected = {isSuccess: false};
    }

    createMessenger(serverSelfUrl, received, answer = {isSuccess: true}, secret = 'test-secret')
    {
        let messenger = new SignedServerToServerMessenger(
            ServerMessengerPropsBuilder.create(serverSelfUrl, this.roomsServers, secret, this.routePath)
        );
        messenger.receiveAction = async (action, targetId, payload) => {
            received.push([action, targetId, payload]);
            return answer;
        };
        return messenger;
    }

    async sendTo(receiver, sendCallback, fetchResult = {ok: true, status: 200})
    {
        let requests = [];
        await GlobalFetchStub.withFetch(async (requestUrl, options) => {
            let body = sc.parseJson(options.body);
            requests.push({requestUrl, body});
            return Object.assign({json: async () => await receiver.receiveRequest({body})}, fetchResult);
        }, sendCallback);
        return requests;
    }

    async signBody(sender, serverUrl, action, targetId, payload)
    {
        return (await this.sendTo(
            {receiveRequest: async () => this.rejected},
            async () => sender.sendRequest(serverUrl, action, targetId, payload)
        )).shift().body;
    }

    async testTheOtherServersAreNormalizedWithoutTheOwnServer()
    {
        await this.test('the other servers addresses are normalized, deduplicated and never the own server', async () => {
            let first = this.createMessenger(this.firstServerUrl, []);
            let noAddress = this.createMessenger('not a url', []);
            this.assert.deepStrictEqual(
                [first.serverSelfAddress, first.otherServersUrls, noAddress.serverSelfAddress, noAddress.otherServersUrls],
                [this.firstServerUrl, [this.secondServerUrl], '', [this.firstServerUrl, this.secondServerUrl]]
            );
        });
    }

    async testARoomMapsOnlyToAnotherServerAddress()
    {
        await this.test('a room maps to the normalized address of another server, never to its own or a broken one', async () => {
            let first = this.createMessenger(this.firstServerUrl, []);
            this.assert.deepStrictEqual(
                ['house', 'forest', 'town', 'broken', 'missing'].map(roomName => first.serverUrlForRoom(roomName)),
                [this.secondServerUrl, this.secondServerUrl, '', '', '']
            );
        });
    }

    async testASignedRequestIsAcceptedOnceWithANewNonce()
    {
        await this.test('a signed request is accepted once with a new nonce on every message and its replay is rejected', async () => {
            let received = [];
            let first = this.createMessenger(this.firstServerUrl, []);
            let second = this.createMessenger(this.secondServerUrl, received);
            let results = [];
            let requests = await this.sendTo(second, async () => {
                results.push(await first.sendRequest(this.secondServerUrl, 'sync', 7, {hp: 5}));
                results.push(await first.sendRequest(this.secondServerUrl, 'sync', 7, {hp: 5}));
            });
            let [firstBody, secondBody] = requests.map(request => request.body);
            let replayed = await second.receiveRequest({body: firstBody});
            this.assert.deepStrictEqual(
                [
                    results,
                    requests.map(request => request.requestUrl),
                    firstBody.nonce === secondBody.nonce,
                    /^[\w-]{22}$/.test(firstBody.nonce),
                    replayed,
                    received
                ],
                [
                    [{isSuccess: true}, {isSuccess: true}],
                    [this.secondServerUrl+this.routePath, this.secondServerUrl+this.routePath],
                    false,
                    true,
                    this.rejected,
                    [['sync', '7', {hp: 5}], ['sync', '7', {hp: 5}]]
                ]
            );
        });
    }

    async testAModifiedOrIncompleteRequestIsRejected()
    {
        await this.test('a modified, incomplete or misdirected request is rejected and never marks the token used', async () => {
            let received = [];
            let first = this.createMessenger(this.firstServerUrl, []);
            let second = this.createMessenger(this.secondServerUrl, received);
            let validBody = await this.signBody(first, this.secondServerUrl, 'sync', 7, {hp: 5});
            let invalidBodies = [
                Object.assign({}, validBody, {nonce: 'another-nonce'}),
                Object.assign({}, validBody, {payload: sc.toJsonString({hp: 9})}),
                Object.assign({}, validBody, {action: 7}),
                Object.assign({}, validBody, {targetId: 7}),
                Object.assign({}, validBody, {targetId: ''}),
                Object.assign({}, validBody, {payload: {hp: 5}}),
                Object.assign({}, validBody, {token: '1.forged'}),
                await this.signBody(first, this.firstServerUrl, 'sync', 7, {hp: 5}),
                await this.signBody(first, this.secondServerUrl, 'sync', 7, 5)
            ];
            let results = [];
            for(let invalidBody of invalidBodies){
                results.push(await second.receiveRequest({body: invalidBody}));
            }
            results.push(await this.createMessenger('not a url', received).receiveRequest({body: validBody}));
            let acceptedResult = await second.receiveRequest({body: validBody});
            this.assert.deepStrictEqual(
                [results, acceptedResult, received],
                [new Array(invalidBodies.length + 1).fill(this.rejected), {isSuccess: true}, [['sync', '7', {hp: 5}]]]
            );
        });
    }

    async testARequestSignedForAnyOwnAddressIsAccepted()
    {
        await this.test('a request signed for the public or the base URL of the receiving server is accepted, another one is not', async () => {
            let received = [];
            let first = this.createMessenger(this.firstServerUrl, []);
            let baseUrl = 'http://internal-2:9000';
            let second = new SignedServerToServerMessenger(Object.assign(
                {routePath: this.routePath},
                ServerMessengerPropsBuilder.createShared(this.secondServerUrl, this.roomsServers, 'test-secret', {
                    'server/baseUrl': baseUrl
                })
            ));
            second.receiveAction = async (action, targetId, payload) => {
                received.push([action, targetId, payload]);
                return {isSuccess: true};
            };
            let results = [];
            for(let serverUrl of [this.secondServerUrl, baseUrl, 'http://internal-3:9000']){
                results.push(await second.receiveRequest({body: first.createRequestBody(serverUrl, 'sync', 7, {})}));
            }
            this.assert.deepStrictEqual(
                [second.serverSelfAddresses, results, received.length],
                [[this.secondServerUrl, baseUrl], [{isSuccess: true}, {isSuccess: true}, this.rejected], 2]
            );
        });
    }

    async testAReceivedActionErrorAnswersAFailedRouteResult()
    {
        await this.test('an error on the received action answers a failed result with the error status instead of rejecting', async () => {
            let first = this.createMessenger(this.firstServerUrl, []);
            let second = this.createMessenger(this.secondServerUrl, []);
            second.receiveAction = async () => Promise.reject({message: 'Storage.'});
            let responses = [];
            await second.handleRouteRequest(
                {body: first.createRequestBody(this.secondServerUrl, 'sync', 7, {})},
                new JsonResponseRecorder().create(responses)
            );
            this.assert.deepStrictEqual(responses, [500, this.rejected]);
        });
    }

    async testTheReceivedAnswerIsReturnedAsIs()
    {
        await this.test('the received action answer is returned as is and only a success answer counts as sent', async () => {
            let first = this.createMessenger(this.firstServerUrl, []);
            let answers = [
                {isSuccess: true, toPlayerId: 4},
                {isSuccess: 'yes'},
                {isSuccess: false, toPlayerId: 4}
            ];
            let results = [];
            for(let answer of answers){
                let receiver = this.createMessenger(this.secondServerUrl, [], answer);
                await this.sendTo(receiver, async () => {
                    results.push(await first.sendRequest(this.secondServerUrl, 'sync', 7, {}));
                });
            }
            this.assert.deepStrictEqual(results, [answers[0], false, false]);
        });
    }

    async testAFailedRequestCountsAsNotSent()
    {
        await this.test('a failed status, a rejected fetch or a missing secret send nothing and every server gets its result', async () => {
            let second = this.createMessenger(this.secondServerUrl, []);
            let first = this.createMessenger(this.firstServerUrl, []);
            let failedStatus = false;
            await this.sendTo(second, async () => {
                failedStatus = await first.sendRequest(this.secondServerUrl, 'sync', 7, {});
            }, {ok: false, status: 503});
            let rejectedFetch = false;
            await GlobalFetchStub.withFetch(() => Promise.reject({message: 'Network.'}), async () => {
                rejectedFetch = await first.sendRequest(this.secondServerUrl, 'sync', 7, {});
            });
            let noSecret = this.createMessenger(this.firstServerUrl, [], {isSuccess: true}, '');
            let noSecretResult = true;
            let noSecretRequests = await this.sendTo(second, async () => {
                noSecretResult = await noSecret.sendRequest(this.secondServerUrl, 'sync', 7, {});
            });
            let serversResults = [];
            await this.sendTo(second, async () => {
                serversResults = await first.sendToServers(first.otherServersUrls, 'sync', 7, {});
            });
            this.assert.deepStrictEqual(
                [failedStatus, rejectedFetch, noSecretResult, noSecretRequests, serversResults],
                [false, false, false, [], [{serverUrl: this.secondServerUrl, response: {isSuccess: true}}]]
            );
        });
    }

}

module.exports.TestSignedServerToServerMessenger = TestSignedServerToServerMessenger;
