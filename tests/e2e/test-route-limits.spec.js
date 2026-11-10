/**
 *
 * Reldens - Test Route Limits
 *
 * Tests the server status route answers for the missing, invalid, foreign, expired and valid tokens, and the per
 * address limiters of the reset password, disconnect user, terms, mailer, firebase, server status and firebase verify
 * routes, exhausted from the local address the browser does not use, with the spoofed forwarding headers ignored.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { LoginServerApi } = require('./helpers/login-server-api');
const { PlayerReset } = require('./helpers/player-reset');
const { SecurityApi } = require('./helpers/security-api');
const { GameConst } = require('../../lib/game/constants');
const { FirebaseConst } = require('../../lib/firebase/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRouteLimits
{

    static TOO_MANY_REQUESTS_STATUS = 429;
    static FORBIDDEN_STATUS = 403;
    static TOKEN_LIFETIME_MS = 60000;
    static SPOOFED_ADDRESS = '10.20.30.40';
    static REPORT_KEYS = ['blockingEnabled', 'exceededLimits', 'isBlocking', 'isOverloaded', 'limits', 'roomsUsage', 'usage'];
    static LIMITED_ROUTES = [
        GameConst.ROUTE_PATHS.DISCONNECT_USER,
        GameConst.ROUTE_PATHS.FIREBASE,
        GameConst.ROUTE_PATHS.MAILER,
        GameConst.ROUTE_PATHS.RESET_PASSWORD,
        GameConst.ROUTE_PATHS.SERVER_STATUS,
        GameConst.ROUTE_PATHS.TERMS_AND_CONDITIONS,
        FirebaseConst.ROUTE_PATHS.VERIFY_ID_TOKEN
    ];

    static async fetchRoute(gameConfig, host, route, headers = {})
    {
        return await fetch(SecurityApi.hostUrl(gameConfig, host)+route, {headers, redirect: 'manual'});
    }

    static async fetchStatusCode(gameConfig, tokenValue, expiresAt)
    {
        return (await TestRouteLimits.fetchRoute(
            gameConfig,
            GameRoomJoin.IPV4_HOST,
            GameConst.ROUTE_PATHS.SERVER_STATUS+'?token='+encodeURIComponent(
                await LoginServerApi.fetchDisconnectToken(gameConfig, tokenValue, expiresAt)
            )
        )).status;
    }

    static async runServerStatusTest(gameConfig)
    {
        let statusRoute = GameConst.ROUTE_PATHS.SERVER_STATUS;
        expect((await TestRouteLimits.fetchRoute(gameConfig, GameRoomJoin.IPV4_HOST, statusRoute)).status, 'No token').toBe(
            TestRouteLimits.FORBIDDEN_STATUS
        );
        let badTokenRoute = statusRoute+'?token=not-a-signed-token';
        expect((await TestRouteLimits.fetchRoute(gameConfig, GameRoomJoin.IPV4_HOST, badTokenRoute)).status, 'Bad token').toBe(
            TestRouteLimits.FORBIDDEN_STATUS
        );
        let futureExpiration = Date.now() + TestRouteLimits.TOKEN_LIFETIME_MS;
        expect(await TestRouteLimits.fetchStatusCode(gameConfig, 'e2e-not-the-status-value', futureExpiration), 'Foreign').toBe(
            TestRouteLimits.FORBIDDEN_STATUS
        );
        let pastExpiration = Date.now() - TestRouteLimits.TOKEN_LIFETIME_MS;
        expect(await TestRouteLimits.fetchStatusCode(gameConfig, GameConst.HEALTH.STATUS_TOKEN_VALUE, pastExpiration), 'Expired').toBe(
            TestRouteLimits.FORBIDDEN_STATUS
        );
        let statusToken = await LoginServerApi.fetchDisconnectToken(gameConfig, GameConst.HEALTH.STATUS_TOKEN_VALUE, futureExpiration);
        let statusResponse = await TestRouteLimits.fetchRoute(
            gameConfig,
            GameRoomJoin.IPV4_HOST,
            statusRoute+'?token='+encodeURIComponent(statusToken)
        );
        expect(statusResponse.status, 'Valid token').toBe(200);
        expect(Object.keys(await statusResponse.json()).sort(), 'Usage report').toEqual(TestRouteLimits.REPORT_KEYS);
    }

    static async exhaustRoute(gameConfig, host, route)
    {
        let firstResponse = await TestRouteLimits.fetchRoute(gameConfig, host, route);
        let remainingMatch = String(firstResponse.headers.get('ratelimit')).match(/r=(\d+)/);
        expect(remainingMatch, route+' must report the remaining requests').toBeTruthy();
        let remainingRequests = Number([...remainingMatch].pop());
        for(let requestIndex = 0; remainingRequests > requestIndex; requestIndex++){
            await TestRouteLimits.fetchRoute(gameConfig, host, route);
        }
        expect((await TestRouteLimits.fetchRoute(gameConfig, host, route)).status, route).toBe(
            TestRouteLimits.TOO_MANY_REQUESTS_STATUS
        );
    }

    static async runRouteLimitsTest(page, gameConfig)
    {
        await DirectFormSubmit.openPage(page);
        let browserAddress = await page.evaluate(
            async () => (await (await fetch('/api/e2e/security/client-address')).json()).address
        );
        let isBrowserOnIpv4 = browserAddress.includes(GameRoomJoin.IPV4_HOST);
        let limitedHost = isBrowserOnIpv4 ? GameRoomJoin.IPV6_HOST : GameRoomJoin.IPV4_HOST;
        let browserHost = isBrowserOnIpv4 ? GameRoomJoin.IPV4_HOST : GameRoomJoin.IPV6_HOST;
        for(let route of TestRouteLimits.LIMITED_ROUTES){
            await TestRouteLimits.exhaustRoute(gameConfig, limitedHost, route);
        }
        let spoofedHeaders = {
            'x-forwarded-for': TestRouteLimits.SPOOFED_ADDRESS,
            'x-real-ip': TestRouteLimits.SPOOFED_ADDRESS,
            'x-client-ip': TestRouteLimits.SPOOFED_ADDRESS
        };
        let termsRoute = GameConst.ROUTE_PATHS.TERMS_AND_CONDITIONS;
        expect((await TestRouteLimits.fetchRoute(gameConfig, limitedHost, termsRoute, spoofedHeaders)).status, 'Spoofed').toBe(
            TestRouteLimits.TOO_MANY_REQUESTS_STATUS
        );
        expect((await TestRouteLimits.fetchRoute(gameConfig, browserHost, termsRoute)).status, 'Another address').toBe(200);
    }

    static run()
    {
        test.describe('Route Limits', () => {
            test.beforeEach(async ({ gameConfig, e2eGroup }) => {
                await PlayerReset.resetAll(gameConfig, e2eGroup);
            });
            test('server status answers the usage report only for a valid status token', async ({ gameConfig }) => {
                await TestRouteLimits.runServerStatusTest(gameConfig);
            });
            test('limited routes answer too many requests over their limit and ignore spoofed headers', async ({ page, gameConfig }) => {
                await TestRouteLimits.runRouteLimitsTest(page, gameConfig);
            });
        });
    }

}

TestRouteLimits.run();
