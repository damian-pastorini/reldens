/**
 *
 * Reldens - Login Server Api
 *
 * HTTP client for the e2e endpoints registered by LoginServerState: the overloaded server, the created rooms, the
 * unavailable rooms, the rooms origin validation, the other server of a multi-server setup, the disconnection of the
 * users on a server change switched off or on, the signed tokens secret
 * (another one set, the server one restored) and the signed disconnection
 * (the disconnect route path, the address of the server under test and the username) and server status tokens, and the
 * server usage report read from the e2e endpoint (the rate limited server status route is exhausted by the route limits
 * spec on the same address).
 *
 */

const { SecurityApi } = require('./security-api');

class LoginServerApi
{

    static SIGNED_TOKENS_SECRET_PATH = '/api/e2e/login-server/signed-tokens-secret';
    static OTHER_SIGNED_TOKENS_SECRET = 'e2e-another-signed-tokens-secret';

    static async setServerOverloaded(gameConfig, isOverloaded, monitorOptions = {})
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/login-server/overloaded',
            {isOverloaded, ...monitorOptions}
        );
    }

    static async isRoomCreated(gameConfig, roomName)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/login-server/room-created?roomName='+encodeURIComponent(roomName)
        )).isCreated;
    }

    static async fetchUsageReport(gameConfig)
    {
        return await SecurityApi.request(gameConfig, 'GET', '/api/e2e/login-server/usage-report');
    }

    static async setRoomsOrigin(gameConfig, roomsOrigin)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/rooms-origin', roomsOrigin);
    }

    static async setDisconnectUsersOnServerChange(gameConfig, enabled)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/login-server/disconnect-on-server-change',
            {enabled}
        )).enabled;
    }

    static async setOtherServer(gameConfig, serverUrl, disconnectUsersOnServerChange)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/login-server/other-server',
            {serverUrl, disconnectUsersOnServerChange}
        );
    }

    static async setSignedTokensSecret(gameConfig, isOtherSecret)
    {
        await SecurityApi.request(
            gameConfig,
            'POST',
            LoginServerApi.SIGNED_TOKENS_SECRET_PATH,
            isOtherSecret ? {secret: LoginServerApi.OTHER_SIGNED_TOKENS_SECRET} : {}
        );
    }

    static async fetchOtherServerHits(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'GET', '/api/e2e/login-server/other-server-hits')).hits;
    }

    static async fetchActiveSessionsCount(gameConfig, username)
    {
        return (await LoginServerApi.fetchActiveSessions(gameConfig, username)).count;
    }

    static async fetchActiveSessions(gameConfig, username)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/login-server/active-sessions?username='+encodeURIComponent(username)
        );
    }

    static async fetchPlayersInRoom(gameConfig, roomName, playerName)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/login-server/players-in-room?roomName='+encodeURIComponent(roomName)
            +'&playerName='+encodeURIComponent(playerName)
        )).count;
    }

    static async runGuestsCleanup(gameConfig, olderThanTime)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/guests-cleanup', {olderThanTime})).deleted;
    }

    static async fetchSignedToken(gameConfig, values, expiresAt)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/signed-token', {values, expiresAt})).token;
    }

    static async fetchDisconnectRequest(gameConfig, username, expiresAt)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/login-server/disconnect-request',
            {username, expiresAt}
        )).requestBody;
    }

    static async fetchStatusToken(gameConfig, statusValue, expiresAt)
    {
        return await LoginServerApi.fetchSignedToken(gameConfig, [statusValue], expiresAt);
    }

}

module.exports.LoginServerApi = LoginServerApi;
