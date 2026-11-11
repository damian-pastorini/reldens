/**
 *
 * Reldens - Test Cross Server Names Check
 *
 */

const { BaseTest } = require('./base-test');
const { CrossServerNamesCheck } = require('../lib/game/server/cross-server-names-check');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');
const { LoginManager } = require('../lib/game/server/login-manager');
const { JsonResponseRecorder } = require('./fixtures/json-response-recorder');
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
    }

    createServer(otherServersUrls, {playerNames = [], usernames = [], emails = []} = {}, secret = 'shared-secret')
    {
        return new CrossServerNamesCheck({
            serversUrls: otherServersUrls,
            expiringHmacToken: new ExpiringHmacToken({secret}),
            usersManager: {
                isNameAvailable: async (playerName) => !playerNames.includes(playerName.toLowerCase()),
                loadUserByUsername: async (username) => usernames.includes(username) ? {username} : false,
                loadUserByEmail: async (email) => emails.includes(email) ? {email} : false
            }
        });
    }

    createServersPair(serverAData = {}, serverBData = {})
    {
        return {
            serverA: this.createServer([this.serverBUrl], serverAData),
            serverB: this.createServer([this.serverAUrl], serverBData)
        };
    }

    routedFetch(serversByUrl, sentRequests)
    {
        return async (requestUrl, requestOptions) => {
            sentRequests.push(requestUrl);
            let serverUrl = Object.keys(serversByUrl).find(url => requestUrl.startsWith(url));
            let checkResponse = {ok: true};
            checkResponse.json = async () => ({
                isAvailable: await serversByUrl[serverUrl].isRequestAvailable(
                    {body: sc.parseJson(requestOptions.body)},
                    requestUrl.slice(serverUrl.length)
                )
            });
            return checkResponse;
        };
    }

    async withFetch(fakeFetch, testCallback)
    {
        let originalFetch = global.fetch;
        global.fetch = fakeFetch;
        try {
            await testCallback();
        } catch(error) {
            global.fetch = originalFetch;
            throw error;
        }
        global.fetch = originalFetch;
    }

    async withServersPair(serversPair, testCallback)
    {
        let sentRequests = [];
        let serversByUrl = {[this.serverAUrl]: serversPair.serverA, [this.serverBUrl]: serversPair.serverB};
        await this.withFetch(this.routedFetch(serversByUrl, sentRequests), async () => await testCallback(sentRequests));
    }

    async testWithoutOtherServersNothingIsRequestedOrHeld()
    {
        await this.test('without other servers the values pass without requests and nothing is held', async () => {
            let singleServer = this.createServer([]);
            let sentRequests = [];
            await this.withFetch(async (requestUrl) => sentRequests.push(requestUrl), async () => {
                this.assert.strictEqual(await singleServer.holdEverywhere(this.playerRoute, ['Hero']), true);
                this.assert.strictEqual(singleServer.release(this.playerRoute, ['Hero']), false);
            });
            this.assert.deepStrictEqual(sentRequests, []);
            this.assert.deepStrictEqual(singleServer.heldValues, {});
        });
    }

    async testANameFreeOnEveryServerIsHeldOnBoth()
    {
        await this.test('a name free on every server passes and is held on both until the local release', async () => {
            let serversPair = this.createServersPair();
            await this.withServersPair(serversPair, async (sentRequests) => {
                this.assert.strictEqual(await serversPair.serverA.holdEverywhere(this.playerRoute, ['Hero']), true);
                this.assert.deepStrictEqual(sentRequests, [this.serverBUrl+this.playerRoute]);
            });
            let holdKey = this.playerRoute+':hero';
            this.assert.strictEqual(Object.keys(serversPair.serverA.heldValues).includes(holdKey), true);
            this.assert.strictEqual(Object.keys(serversPair.serverB.heldValues).includes(holdKey), true);
            this.assert.strictEqual(serversPair.serverA.release(this.playerRoute, ['Hero']), true);
            this.assert.deepStrictEqual(serversPair.serverA.heldValues, {});
        });
    }

    async testANameStoredOnAnotherServerIsRejected()
    {
        await this.test('a name stored on another server is rejected and the local hold is released', async () => {
            let serversPair = this.createServersPair({}, {playerNames: ['hero']});
            await this.withServersPair(serversPair, async () => {
                this.assert.strictEqual(await serversPair.serverA.holdEverywhere(this.playerRoute, ['Hero']), false);
            });
            this.assert.deepStrictEqual(serversPair.serverA.heldValues, {});
            this.assert.deepStrictEqual(serversPair.serverB.heldValues, {});
        });
    }

    async testANameHeldByALocalCreationIsRejectedToAnotherServer()
    {
        await this.test('a name held by a creation running on a server is rejected to the other server', async () => {
            let serversPair = this.createServersPair();
            await this.withServersPair(serversPair, async () => {
                this.assert.strictEqual(await serversPair.serverA.holdEverywhere(this.playerRoute, ['Hero']), true);
                this.assert.strictEqual(await serversPair.serverB.holdEverywhere(this.playerRoute, ['hero']), false);
                serversPair.serverA.release(this.playerRoute, ['Hero']);
                serversPair.serverB.removeExpiredHolds(Date.now()+GameConst.NAMES_CHECK.REMOTE_HOLD_MS);
                this.assert.strictEqual(await serversPair.serverB.holdEverywhere(this.playerRoute, ['hero']), true);
            });
        });
    }

    async testTheSameNameOnTwoServersAtTheSameTimeNeverPassesTwice()
    {
        await this.test('the same name checked by two servers at the same time never passes on both', async () => {
            let serversPair = this.createServersPair();
            await this.withServersPair(serversPair, async () => {
                let results = await Promise.all([
                    serversPair.serverA.holdEverywhere(this.playerRoute, ['Hero']),
                    serversPair.serverB.holdEverywhere(this.playerRoute, ['Hero'])
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
                await serversPair.serverA.holdEverywhere(this.playerRoute, ['Hero']);
            });
            serversPair.serverB.removeExpiredHolds(Date.now()+GameConst.NAMES_CHECK.REMOTE_HOLD_MS);
            this.assert.deepStrictEqual(serversPair.serverB.heldValues, {});
            this.assert.strictEqual(serversPair.serverB.hold(this.playerRoute, ['Hero'], 1000), true);
        });
    }

    async testTheUsernameAndEmailAreCheckedTogether()
    {
        await this.test('a username or an email stored on another server rejects the registration values', async () => {
            let serversPair = this.createServersPair({}, {usernames: ['bob'], emails: ['alice@test.com']});
            await this.withServersPair(serversPair, async () => {
                let serverA = serversPair.serverA;
                this.assert.strictEqual(await serverA.holdEverywhere(this.userRoute, ['bob', 'bob@test.com']), false);
                this.assert.strictEqual(await serverA.holdEverywhere(this.userRoute, ['alice', 'alice@test.com']), false);
                this.assert.strictEqual(await serverA.holdEverywhere(this.userRoute, ['carol', 'carol@test.com']), true);
            });
            this.assert.deepStrictEqual(Object.keys(serversPair.serverB.heldValues), [
                this.userRoute+':carol',
                this.userRoute+':carol@test.com'
            ]);
        });
    }

    async testARequestWithAnInvalidTokenIsRejected()
    {
        await this.test('a check without token, with another route token or another secret is rejected', async () => {
            let serverB = this.createServer([this.serverAUrl]);
            let otherSecretToken = new ExpiringHmacToken({secret: 'other-secret'})
                .generate([this.playerRoute, 'Hero'], Date.now()+60000);
            let disconnectionToken = serverB.expiringHmacToken.generate(['Hero'], Date.now()+60000);
            let otherRouteToken = serverB.expiringHmacToken.generate([this.userRoute, 'Hero'], Date.now()+60000);
            let expiredToken = serverB.expiringHmacToken.generate([this.playerRoute, 'Hero'], Date.now()-1);
            for(let token of ['', otherSecretToken, disconnectionToken, otherRouteToken, expiredToken]){
                this.assert.strictEqual(
                    await serverB.isRequestAvailable({body: {values: ['Hero'], token}}, this.playerRoute),
                    false
                );
            }
            this.assert.deepStrictEqual(serverB.heldValues, {});
        });
    }

    async testARequestWithInvalidValuesIsRejected()
    {
        await this.test('a check with no body or values of a wrong count, type or length is rejected', async () => {
            let serverB = this.createServer([this.serverAUrl]);
            let invalidBodies = [
                null,
                {},
                {values: 'Hero'},
                {values: []},
                {values: ['Hero', 'extra']},
                {values: [12]},
                {values: ['']},
                {values: ['a'.repeat(256)]}
            ];
            for(let invalidBody of invalidBodies){
                this.assert.strictEqual(await serverB.isRequestAvailable({body: invalidBody}, this.playerRoute), false);
            }
            this.assert.strictEqual(
                await serverB.isRequestAvailable({body: {values: ['bob']}}, this.userRoute),
                false
            );
            this.assert.deepStrictEqual(serverB.heldValues, {});
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
                async () => ({ok: true, json: async () => ({isAvailable: 'yes'})}),
                async () => ({ok: true, json: async () => ({})})
            ];
            for(let failedResponse of failedResponses){
                await this.withFetch(failedResponse, async () => {
                    this.assert.strictEqual(await serverA.holdEverywhere(this.playerRoute, ['Hero']), false);
                });
                this.assert.deepStrictEqual(serverA.heldValues, {});
            }
        });
    }

    createLoginManager(configValues)
    {
        let loginManager = Object.create(LoginManager.prototype);
        loginManager.config = {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)};
        return loginManager;
    }

    async testTheCheckedServersAreTheValidConfiguredUrlsWithoutThisServer()
    {
        await this.test('the checked servers are the valid configured URLs without this server public URL', async () => {
            let configuredServers = ' http://server-a:8080 , http://server-b:8080,not an url,, http://server-c:8080/';
            let loginManager = this.createLoginManager({
                'server/rooms/databases': configuredServers,
                'server/publicUrl': this.serverAUrl
            });
            this.assert.deepStrictEqual(loginManager.fetchNamesCheckServersUrls(), [
                'http://server-b:8080',
                'http://server-c:8080/'
            ]);
            let withoutPublicUrl = this.createLoginManager({'server/rooms/databases': configuredServers});
            this.assert.deepStrictEqual(withoutPublicUrl.fetchNamesCheckServersUrls(), [
                'http://server-a:8080',
                'http://server-b:8080',
                'http://server-c:8080/'
            ]);
            this.assert.deepStrictEqual(this.createLoginManager({}).fetchNamesCheckServersUrls(), []);
        });
    }

    async testTheCheckRouteAnswersTheResultAndAFailedResultOnErrors()
    {
        await this.test('the check route answers the check result and a failed result when the check fails', async () => {
            let loginManager = this.createLoginManager({});
            let checkedRoutes = [];
            let checkError = new Error('Storage failed.');
            let responses = [];
            let response = new JsonResponseRecorder().create(responses);
            loginManager.crossServerNamesCheck = {
                isRequestAvailable: async (req, routePath) => checkedRoutes.push(routePath) && true
            };
            await loginManager.handleNamesCheckRequest(this.playerRoute, {body: {}}, response);
            loginManager.crossServerNamesCheck = {
                isRequestAvailable: async () => {
                    throw checkError;
                }
            };
            await loginManager.handleNamesCheckRequest(this.userRoute, {body: {}}, response);
            this.assert.deepStrictEqual(checkedRoutes, [this.playerRoute]);
            this.assert.deepStrictEqual(responses, [{isAvailable: true}, 500, {isAvailable: false}]);
        });
    }

    async testTheChecksAreNotSentWithoutTheSignedTokensSecret()
    {
        await this.test('without the signed tokens secret no check is sent and the values are not free', async () => {
            let serverA = this.createServer([this.serverBUrl], {}, '');
            let sentRequests = [];
            await this.withFetch(async (requestUrl) => sentRequests.push(requestUrl), async () => {
                this.assert.strictEqual(await serverA.holdEverywhere(this.playerRoute, ['Hero']), false);
            });
            this.assert.deepStrictEqual(sentRequests, []);
            this.assert.deepStrictEqual(serverA.heldValues, {});
        });
    }

}

module.exports.TestCrossServerNamesCheck = TestCrossServerNamesCheck;
