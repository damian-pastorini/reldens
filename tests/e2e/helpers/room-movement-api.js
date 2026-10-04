/**
 *
 * Reldens - Room Movement Api
 *
 * HTTP client for the e2e room movement endpoints registered by RoomMovementState: the player and object bodies
 * snapshots, the path finder tiles around a tile (walkable, walls, change points and the other blocked tiles), the
 * object path, move, move back to the original tile, placement and random movement switch, and the trail collected
 * from the server snapshots until a condition is met, so every movement spec asserts the exact server bodies.
 *
 */

const { setTimeout: waitMs } = require('timers/promises');
const { SecurityApi } = require('./security-api');
const { sc } = require('@reldens/utils');

class RoomMovementApi
{

    static POLL_MS = 100;

    static async fetchPlayer(gameConfig, roomName, playerName)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'GET',
                '/api/e2e/movement/player?'+new URLSearchParams({roomName, playerName}).toString()
            ),
            'player',
            false
        );
    }

    static async fetchObject(gameConfig, roomName, objectKey)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'GET',
                '/api/e2e/movement/object?'+new URLSearchParams({roomName, objectKey}).toString()
            ),
            'object',
            false
        );
    }

    static async fetchPath(gameConfig, roomName, fromTile, toTile)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'GET',
                '/api/e2e/movement/path?'+new URLSearchParams({
                    roomName,
                    from: fromTile.join(','),
                    to: toTile.join(',')
                }).toString()
            ),
            'path',
            []
        );
    }

    static async fetchTiles(gameConfig, roomName, tile, radius)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/movement/tiles?'+new URLSearchParams({roomName, column: tile[0], row: tile[1], radius}).toString()
        );
    }

    static async setObjectPath(gameConfig, roomName, objectKey, path, useAreaGrid)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'POST',
                '/api/e2e/movement/object-path',
                {roomName, objectKey, path, useAreaGrid}
            ),
            'object',
            false
        );
    }

    static async moveObject(gameConfig, roomName, objectKey, tile, useAreaGrid)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'POST',
                '/api/e2e/movement/object-move',
                {roomName, objectKey, column: tile[0], row: tile[1], useAreaGrid}
            ),
            'object',
            false
        );
    }

    static async moveObjectToOriginalTile(gameConfig, roomName, objectKey, useAreaGrid)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'POST',
                '/api/e2e/movement/object-original-tile',
                {roomName, objectKey, useAreaGrid}
            ),
            'object',
            false
        );
    }

    static async placeObject(gameConfig, roomName, objectKey, tile)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'POST',
                '/api/e2e/movement/object-place',
                {roomName, objectKey, column: tile[0], row: tile[1]}
            ),
            'object',
            false
        );
    }

    static async switchRandomMovement(gameConfig, roomName, objectKey, enabled)
    {
        return sc.get(
            await SecurityApi.request(
                gameConfig,
                'POST',
                '/api/e2e/movement/object-random-movement',
                {roomName, objectKey, enabled}
            ),
            'object',
            false
        );
    }

    static async collectTrail(fetchSnapshot, isDone, timeout)
    {
        let trail = [];
        let maxPolls = Math.max(1, Math.ceil(timeout / RoomMovementApi.POLL_MS));
        for(let poll = 0; poll < maxPolls; poll++){
            let snapshot = await fetchSnapshot();
            trail.push(snapshot);
            if(snapshot && isDone(snapshot)){
                return {done: true, trail, last: snapshot};
            }
            await waitMs(RoomMovementApi.POLL_MS);
        }
        return {done: false, trail, last: sc.get(trail, trail.length - 1, false)};
    }

}

module.exports.RoomMovementApi = RoomMovementApi;
