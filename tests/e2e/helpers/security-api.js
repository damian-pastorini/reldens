/**
 *
 * Reldens - Security Api
 *
 * HTTP client for the e2e security endpoints registered by SecurityState: lowered limits, bans, denied addresses,
 * stored address blocks, the simulated restart, the reset password sent time, the test mailer switch and the emails
 * recorded by the test mailer. The requests always go to the IPv4 loopback address, so the tests that deny the IPv6
 * loopback address never cut the e2e endpoints, and to server-1 unless the game config is the one of a numbered
 * instance (E2eServerInstances.forServer, its serverBaseUrl). It also exhausts the per address limiter of a rate
 * limited route from a given loopback host (the remaining requests read from the ratelimit header of a first request,
 * then the next one must answer too many requests; the disconnect user route and the teams and chat sync routes are
 * limited only on their unsigned POST requests, so they are exhausted with POST requests and every other route with GET
 * requests). A request the server does not answer within the request timeout
 * logs its method and path as critical and gives false, so a blocked server is reported by the call that waited on it
 * instead of a test timeout.
 *
 */

const { expect } = require('@playwright/test');
const { GameConst } = require('../../../lib/game/constants');
const { TeamsConst } = require('../../../lib/teams/constants');
const { ChatConst } = require('../../../lib/chat/constants');
const { Logger, sc } = require('@reldens/utils');

class SecurityApi
{

    static API_HOST = '127.0.0.1';
    static TOO_MANY_REQUESTS_STATUS = 429;
    static REQUEST_TIMEOUT_MS = 30000;
    static POST_LIMITED_ROUTES = [GameConst.ROUTE_PATHS.DISCONNECT_USER, TeamsConst.SYNC.TEAMS_ROUTE, ChatConst.SYNC.ROUTE];

    static baseUrl(gameConfig)
    {
        let serverBaseUrl = sc.get(gameConfig, 'serverBaseUrl', '');
        if('' === serverBaseUrl){
            serverBaseUrl = process.env.RELDENS_E2E_PORT
                ? 'http://localhost:'+process.env.RELDENS_E2E_PORT
                : sc.get(gameConfig, 'baseUrl', 'http://localhost:8080');
        }
        return serverBaseUrl;
    }

    static hostUrl(gameConfig, host)
    {
        let hostUrl = new URL(SecurityApi.baseUrl(gameConfig));
        hostUrl.hostname = host;
        return hostUrl.origin;
    }

    static async request(gameConfig, method, path, body)
    {
        let options = {
            method,
            headers: {'Content-Type': 'application/json'},
            signal: AbortSignal.timeout(SecurityApi.REQUEST_TIMEOUT_MS)
        };
        if(body){
            options.body = JSON.stringify(body);
        }
        try {
            return await (await fetch(
                new URL(path, SecurityApi.hostUrl(gameConfig, SecurityApi.API_HOST)).toString(),
                options
            )).json();
        } catch(error) {
            Logger.critical('The e2e request '+method+' '+path+' failed.', error.message);
            return false;
        }
    }

    static async updateSettings(gameConfig, settings)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/settings', settings);
    }

    static async banUser(gameConfig, username)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/ban-user', {username});
    }

    static async denyAddresses(gameConfig, addresses, durationMs)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/security/deny-addresses',
            {addresses, durationMs}
        );
    }

    static async fetchStoredBlocks(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'GET', '/api/e2e/security/stored-blocks')).blocks;
    }

    static async fetchIdentityState(gameConfig, identity)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/security/identity-hits?identity='+encodeURIComponent(identity)
        );
    }

    static async restoreBlocks(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/restore-blocks', {})).restored;
    }

    static async markResetSent(gameConfig, username)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/security/mark-reset-sent',
            {username}
        )).sentTime;
    }

    static async fetchResetSentTime(gameConfig, username)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/security/reset-sent-time?username='+encodeURIComponent(username)
        )).sentTime;
    }

    static async setMailerEnabled(gameConfig, enabled)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/mailer', {enabled});
    }

    static async fetchSentEmails(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'GET', '/api/e2e/security/sent-emails')).emails;
    }

    static async exhaustRoute(gameConfig, host, route)
    {
        let routeUrl = SecurityApi.hostUrl(gameConfig, host)+route;
        let requestOptions = {
            method: -1 === SecurityApi.POST_LIMITED_ROUTES.indexOf(route) ? 'GET' : 'POST',
            redirect: 'manual'
        };
        let firstResponse = await fetch(routeUrl, requestOptions);
        let remainingMatch = String(firstResponse.headers.get('ratelimit')).match(/r=(\d+)/);
        expect(remainingMatch, route+' must report the remaining requests').toBeTruthy();
        let remainingRequests = Number([...remainingMatch].pop());
        for(let requestIndex = 0; remainingRequests > requestIndex; requestIndex++){
            await fetch(routeUrl, requestOptions);
        }
        expect((await fetch(routeUrl, requestOptions)).status, route).toBe(SecurityApi.TOO_MANY_REQUESTS_STATUS);
    }

}

module.exports.SecurityApi = SecurityApi;
