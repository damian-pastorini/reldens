/**
 *
 * Reldens - Test Cross Server Names Check
 *
 * Tests the CrossServerNamesCheck between servers wired through a routed fetch: a free name is held on both under its
 * hold id until the release with that id frees it on both (a release with another id keeps it), a stored or held name
 * is rejected, any other server rejecting or failing releases every hold, a message is accepted once, only signed for
 * the receiving server address and its names route, and a message with invalid values, hold id or action is rejected.
 * The login manager names check servers and routes are tested in TestLoginManagerNamesCheck.
 *
 */

const { BaseTest } = require('./base-test');
const { CrossServerNamesCheck } = require('../lib/game/server/cross-server-names-check');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { GlobalFetchStub } = require('./fixtures/global-fetch-stub');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestCrossServerNamesCheck extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.playerRoute = GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME;
        this.userRoute = GameConst.ROUTE_PATHS.CHECK_USER_NAME;
        this.serverAUrl = 'http://server-a:8080';
        this.serverBUrl = 'http://server-b:8080';
        this.serverCUrl = 'http://server-c:8080';
        this.holdIdLength = GameConst.NAMES_CHECK.HOLD_ID_LENGTH;
        this.holdId = 'h'.repeat(this.holdIdLength);
        this.rejected = {isSuccess: false};
    }

    createServer(otherServersUrls, storedValues = {}, secret = 'shared-secret', serverSelfUrl = this.serverBUrl, routePath = this.playerRoute)
    {
        let playerNames = sc.get(storedValues, 'playerNames', []);
        let usernames = sc.get(storedValues, 'usernames', []);
        let emails = sc.get(storedValues, 'emails', []);
        return new CrossServerNamesCheck(Object.assign(
            {
                serversUrls: otherServersUrls,
                usersManager: {
                    isNameAvailable: async (playerName) => !playerNames.includes(playerName.toLowerCase()),
                    loadUserByUsername: async (username) => usernames.includes(username) ? {username} : false,
                    loadUserByEmail: async (email) => emails.includes(email) ? {email} : false
                }
            },
            ServerMessengerPropsBuilder.create(serverSelfUrl, {}, secret, routePath)
        ));
    }

    createServersPair(serverAData = {}, serverBData = {}, routePath = this.playerRoute)
    {
        return {
            serverA: this.createServer([this.serverBUrl], serverAData, 'shared-secret', this.serverAUrl, routePath),
            serverB: this.createServer([this.serverAUrl], serverBData, 'shared-secret', this.serverBUrl, routePath)
        };
    }

    routedFetch(serversByUrl, sentRequests)
    {
        return async (requestUrl, requestOptions) => {
            sentRequests.push(requestUrl);
            let serverUrl = Object.keys(serversByUrl).find(url => requestUrl.startsWith(url));
            return {
                ok: true,
                json: async () => await serversByUrl[serverUrl].receiveRequest({body: sc.parseJson(requestOptions.body)})
            };
        };
    }

    async withServersPair(serversPair, testCallback)
    {
        let sentRequests = [];
        let serversByUrl = {[this.serverAUrl]: serversPair.serverA, [this.serverBUrl]: serversPair.serverB};
        let routedFetch = this.routedFetch(serversByUrl, sentRequests);
        await GlobalFetchStub.withFetch(routedFetch, async () => await testCallback(sentRequests));
    }

    async testWithoutOtherServersNothingIsRequestedOrHeld()
    {
        await this.test('without other servers the values pass without requests and nothing is held', async () => {
            let singleServer = this.createServer([]);
            let sentRequests = [];
            await GlobalFetchStub.withFetch(async (requestUrl) => sentRequests.push(requestUrl), async () => {
                let holdId = await singleServer.holdEverywhere(['Hero']);
                this.assert.strictEqual(String(holdId).length, this.holdIdLength);
                this.assert.strictEqual(await singleServer.release(['Hero'], holdId), false);
            });
            this.assert.deepStrictEqual(sentRequests, []);
            this.assert.deepStrictEqual(singleServer.heldValues, {});
        });
    }

    async testANameFreeOnEveryServerIsHeldOnBoth()
    {
        await this.test('a name free on every server is held on both until the release frees it on both', async () => {
            let serversPair = this.createServersPair();
            let heldKeys = [];
            await this.withServersPair(serversPair, async (sentRequests) => {
                let holdId = await serversPair.serverA.holdEverywhere(['Hero']);
                this.assert.strictEqual(String(holdId).length, this.holdIdLength);
                heldKeys.push(Object.keys(serversPair.serverA.heldValues), Object.keys(serversPair.serverB.heldValues));
                await serversPair.serverA.release(['Hero'], this.holdId);
                heldKeys.push(Object.keys(serversPair.serverA.heldValues), Object.keys(serversPair.serverB.heldValues));
                this.assert.strictEqual(await serversPair.serverA.release(['Hero'], holdId), true);
                this.assert.deepStrictEqual(sentRequests, new Array(3).fill(this.serverBUrl+this.playerRoute));
            });
            this.assert.deepStrictEqual(
                [heldKeys, serversPair.serverA.heldValues, serversPair.serverB.heldValues],
                [[['hero'], ['hero'], ['hero'], ['hero']], {}, {}]
            );
        });
    }

    async testANameStoredOnAnotherServerIsRejected()
    {
        await this.test('a name stored on another server is rejected and the local hold is released', async () => {
            let serversPair = this.createServersPair({}, {playerNames: ['hero']});
            await this.withServersPair(serversPair, async () => {
                this.assert.strictEqual(await serversPair.serverA.holdEverywhere(['Hero']), false);
            });
            this.assert.deepStrictEqual(serversPair.serverA.heldValues, {});
            this.assert.deepStrictEqual(serversPair.serverB.heldValues, {});
        });
    }

    async testANameHeldByALocalCreationIsRejectedToAnotherServer()
    {
        await this.test('a name held by a running creation is rejected to the other server and free at once after its release', async () => {
            let serversPair = this.createServersPair();
            let results = [];
            await this.withServersPair(serversPair, async () => {
                let holdId = await serversPair.serverA.holdEverywhere(['Hero']);
                results.push(String(holdId).length);
                results.push(await serversPair.serverB.holdEverywhere(['hero']));
                results.push(Object.keys(serversPair.serverA.heldValues).length);
                await serversPair.serverA.release(['Hero'], holdId);
                results.push(String(await serversPair.serverB.holdEverywhere(['hero'])).length);
            });
            this.assert.deepStrictEqual(results, [this.holdIdLength, false, 1, this.holdIdLength]);
        });
    }

    async testTheSameNameOnTwoServersAtTheSameTimeNeverPassesTwice()
    {
        await this.test('the same name checked by two servers at the same time never passes on both', async () => {
            let serversPair = this.createServersPair();
            await this.withServersPair(serversPair, async () => {
                let results = await Promise.all([
                    serversPair.serverA.holdEverywhere(['Hero']),
                    serversPair.serverB.holdEverywhere(['Hero'])
                ]);
                this.assert.strictEqual(results.filter(result => result).length < 2, true);
            });
        });
    }

    async testTheRemoteHoldExpires()
    {
        await this.test('the hold of a remote check expires, so a creation that never ends frees the name', async () => {
            let serversPair = this.createServersPair();
            await this.withServersPair(serversPair, async () => {
                await serversPair.serverA.holdEverywhere(['Hero']);
            });
            serversPair.serverB.removeExpiredHolds(Date.now()+GameConst.NAMES_CHECK.REMOTE_HOLD_MS);
            this.assert.deepStrictEqual(serversPair.serverB.heldValues, {});
            this.assert.strictEqual(serversPair.serverB.hold(['Hero'], 1000, this.holdId), true);
        });
    }

    async testTheUsernameAndEmailAreCheckedTogether()
    {
        await this.test('a username or an email stored on another server rejects the registration values', async () => {
            let serversPair = this.createServersPair({}, {usernames: ['bob'], emails: ['alice@test.com']}, this.userRoute);
            await this.withServersPair(serversPair, async () => {
                let serverA = serversPair.serverA;
                this.assert.strictEqual(await serverA.holdEverywhere(['bob', 'bob@test.com']), false);
                this.assert.strictEqual(await serverA.holdEverywhere(['alice', 'alice@test.com']), false);
                let carolHoldId = await serverA.holdEverywhere(['carol', 'carol@test.com']);
                this.assert.strictEqual(String(carolHoldId).length, this.holdIdLength);
            });
            this.assert.deepStrictEqual(Object.keys(serversPair.serverB.heldValues), ['carol', 'carol@test.com']);
        });
    }

    async testAModifiedOrMisdirectedCheckIsRejected()
    {
        await this.test('a check without token, modified, signed with another secret or for the other names route is rejected', async () => {
            let serverA = this.createServer([this.serverBUrl], {}, 'shared-secret', this.serverAUrl);
            let serverB = this.createServer([this.serverAUrl]);
            let otherSecretServer = this.createServer([this.serverBUrl], {}, 'other-secret', this.serverAUrl);
            let userRouteServer = this.createServer([this.serverBUrl], {}, 'shared-secret', this.serverAUrl, this.userRoute);
            let checkAction = GameConst.NAMES_CHECK.CHECK_ACTION;
            let validBody = serverA.createRequestBody(this.serverBUrl, checkAction, this.holdId, {values: ['Hero']});
            let invalidBodies = [
                Object.assign({}, validBody, {token: ''}),
                Object.assign({}, validBody, {payload: sc.toJsonString({values: ['Other']})}),
                Object.assign({}, validBody, {targetId: 'g'.repeat(this.holdIdLength)}),
                Object.assign({}, validBody, {action: GameConst.NAMES_CHECK.RELEASE_ACTION}),
                otherSecretServer.createRequestBody(this.serverBUrl, checkAction, this.holdId, {values: ['Hero']}),
                userRouteServer.createRequestBody(this.serverBUrl, checkAction, this.holdId, {values: ['Hero']})
            ];
            let results = [];
            for(let body of invalidBodies){
                results.push(await serverB.receiveRequest({body}));
            }
            this.assert.deepStrictEqual(
                [results, serverB.heldValues],
                [new Array(invalidBodies.length).fill(this.rejected), {}]
            );
        });
    }

    async testARequestWithInvalidValuesIsRejected()
    {
        await this.test('a check with values of a wrong count, type or length, a wrong hold id or action is rejected', async () => {
            let serverB = this.createServer([this.serverAUrl]);
            let checkAction = GameConst.NAMES_CHECK.CHECK_ACTION;
            let invalidMessages = [
                [checkAction, this.holdId, {}],
                [checkAction, this.holdId, {values: 'Hero'}],
                [checkAction, this.holdId, {values: []}],
                [checkAction, this.holdId, {values: ['Hero', 'extra']}],
                [checkAction, this.holdId, {values: [12]}],
                [checkAction, this.holdId, {values: ['']}],
                [checkAction, this.holdId, {values: ['a'.repeat(256)]}],
                [checkAction, 'short', {values: ['Hero']}],
                ['other', this.holdId, {values: ['Hero']}]
            ];
            let results = [];
            for(let [action, holdId, payload] of invalidMessages){
                results.push(await serverB.receiveAction(action, holdId, payload));
            }
            let userRouteServer = this.createServer([this.serverAUrl], {}, 'shared-secret', this.serverBUrl, this.userRoute);
            results.push(await userRouteServer.receiveAction(checkAction, this.holdId, {values: ['bob']}));
            this.assert.deepStrictEqual(
                [results, serverB.heldValues, userRouteServer.heldValues],
                [new Array(invalidMessages.length + 1).fill(this.rejected), {}, {}]
            );
        });
    }

    async testAnUnreachableOrFailedServerCountsAsNotFree()
    {
        await this.test('a server that fails, answers an error status or bad data counts as the values not free', async () => {
            let serverA = this.createServer([this.serverBUrl], {});
            let fetchError = new TypeError('fetch failed');
            let failedResponses = [
                async () => {
                    throw fetchError;
                },
                async () => ({ok: false, status: 429}),
                async () => ({ok: true, json: async () => ({isSuccess: 'yes'})}),
                async () => ({ok: true, json: async () => ({})})
            ];
            for(let failedResponse of failedResponses){
                await GlobalFetchStub.withFetch(failedResponse, async () => {
                    this.assert.strictEqual(await serverA.holdEverywhere(['Hero']), false);
                });
                this.assert.deepStrictEqual(serverA.heldValues, {});
            }
        });
    }

    async testACheckIsAcceptedOnceOnlyByItsTargetServer()
    {
        await this.test('a check is accepted once and only by the server it was signed for', async () => {
            let serverA = this.createServer([this.serverBUrl], {}, 'shared-secret', this.serverAUrl);
            let serverB = this.createServer([this.serverAUrl], {}, 'shared-secret', this.serverBUrl);
            let serverC = this.createServer([this.serverAUrl], {}, 'shared-secret', this.serverCUrl);
            let sentBodies = [];
            await GlobalFetchStub.withFetch(async (requestUrl, options) => {
                sentBodies.push(sc.parseJson(options.body));
                return {ok: true, json: async () => ({isSuccess: true})};
            }, async () => serverA.holdEverywhere(['Hero']));
            let body = sentBodies.shift();
            let results = [
                await serverC.receiveRequest({body}),
                await serverB.receiveRequest({body}),
                await serverB.receiveRequest({body})
            ];
            this.assert.deepStrictEqual(
                [results, Object.keys(serverB.heldValues), serverC.heldValues],
                [[this.rejected, {isSuccess: true}, this.rejected], ['hero'], {}]
            );
        });
    }

    async testARejectionOfAnyServerReleasesEveryHold()
    {
        await this.test('a name rejected by one of the other servers is released on every server', async () => {
            let serverA = this.createServer([this.serverBUrl, this.serverCUrl], {}, 'shared-secret', this.serverAUrl);
            let serverB = this.createServer([this.serverAUrl], {}, 'shared-secret', this.serverBUrl);
            let serverC = this.createServer([this.serverAUrl], {playerNames: ['hero']}, 'shared-secret', this.serverCUrl);
            let serversByUrl = {[this.serverAUrl]: serverA, [this.serverBUrl]: serverB, [this.serverCUrl]: serverC};
            let sentRequests = [];
            let holdResult = true;
            await GlobalFetchStub.withFetch(this.routedFetch(serversByUrl, sentRequests), async () => {
                holdResult = await serverA.holdEverywhere(['Hero']);
            });
            this.assert.deepStrictEqual(
                [holdResult, serverA.heldValues, serverB.heldValues, serverC.heldValues, sentRequests.length],
                [false, {}, {}, {}, 4]
            );
        });
    }

    async testTheChecksAreNotSentWithoutTheSignedTokensSecret()
    {
        await this.test('without the signed tokens secret no check is sent and the values are not free', async () => {
            let serverA = this.createServer([this.serverBUrl], {}, '');
            let sentRequests = [];
            await GlobalFetchStub.withFetch(async (requestUrl) => sentRequests.push(requestUrl), async () => {
                this.assert.strictEqual(await serverA.holdEverywhere(['Hero']), false);
            });
            this.assert.deepStrictEqual(sentRequests, []);
            this.assert.deepStrictEqual(serverA.heldValues, {});
        });
    }

}

module.exports.TestCrossServerNamesCheck = TestCrossServerNamesCheck;
