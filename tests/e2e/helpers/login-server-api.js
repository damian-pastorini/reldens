/**
 *
 * Reldens - Login Server Api
 *
 * HTTP client for the e2e endpoints registered by LoginServerState: the overloaded server, the created rooms, the
 * unavailable rooms, the rooms origin validation, the other server of a multi-server setup and the signed disconnection
 * tokens, and the usage report answered by the server status route for a signed status token.
 *
 */

const { SecurityApi } = require('./security-api');
const { GameConst } = require('../../../lib/game/constants');

class LoginServerApi
{

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
        let statusToken = await LoginServerApi.fetchDisconnectToken(
            gameConfig,
            GameConst.HEALTH.STATUS_TOKEN_VALUE,
            Date.now() + GameConst.SIGNED_TOKENS.SERVER_STATUS_EXPIRATION
        );
        return await SecurityApi.request(
            gameConfig,
            'GET',
            GameConst.ROUTE_PATHS.SERVER_STATUS+'?token='+encodeURIComponent(statusToken)
        );
    }

    static async setRoomsOrigin(gameConfig, roomsOrigin)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/rooms-origin', roomsOrigin);
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

    static async fetchOtherServerHits(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'GET', '/api/e2e/login-server/other-server-hits')).hits;
    }

    static async fetchActiveSessionsCount(gameConfig, username)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/login-server/active-sessions?username='+encodeURIComponent(username)
        )).count;
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

    static async fetchDisconnectToken(gameConfig, username, expiresAt)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/login-server/disconnect-token',
            {username, expiresAt}
        )).token;
    }

}

module.exports.LoginServerApi = LoginServerApi;
