/**
 *
 * Reldens - World E2E State Api
 *
 * HTTP client for the e2e endpoints registered by WorldE2eStateProbe: block and unblock the scene changes of a live
 * room, set and restore the cancel flags of a timing object and read the timing object state.
 *
 */

const { SecurityApi } = require('./security-api');

class WorldE2eStateApi
{

    static async blockSceneChanges(gameConfig, roomName, durationMs)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/world/block-scene-changes', {roomName, durationMs});
    }

    static async unblockSceneChanges(gameConfig, roomName)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/world/unblock-scene-changes', {roomName});
    }

    static async setTimingFlags(gameConfig, roomName, objectKey, timingFlags, durationMs)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/world/timing-flags',
            {roomName, objectKey, timingFlags, durationMs}
        );
    }

    static async restoreTimingFlags(gameConfig, roomName, objectKey)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/world/restore-timing-flags', {roomName, objectKey});
    }

    static async fetchTimingObject(gameConfig, roomName, objectKey)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/world/timing-object', {roomName, objectKey});
    }

}

module.exports.WorldE2eStateApi = WorldE2eStateApi;
