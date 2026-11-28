/**
 *
 * Reldens - Room Movement Api
 *
 * HTTP client for the e2e room movement endpoints registered by RoomMovementState: the player and object bodies
 * snapshots, the path finder tiles around a tile (walkable, walls, change points and the other blocked tiles), the
 * object path, move, move back to the original tile, placement and random movement switch, the player placement on a
 * given position, and the trail collected
 * from the server snapshots until a condition is met or its timeout passes (in time, so a slow server never stretches
 * the wait past the test timeout and the caller fails with the last snapshot) (like a player standing still: no path steps and no velocity,
 * or settled: the same position on two polls in a row, after a wall contact pushed a stopped body out), also with the
 * server steps of the player body recorded while the trail is collected (RoomMovementStepsRecorder, the last ones that
 * changed are returned to show in a failure, a step equal to the previous one is dropped so an idle body does not hide
 * the step that emptied or stopped the path), so every movement spec asserts the exact server bodies. A held direction
 * sets its velocity once per world step (ISSUE #456) and the body damping lowers it during the step, so the expected
 * velocity accepts the movement speed or up to one unit under it (the rounded snapshot velocity read between steps).
 *
 */

const { setTimeout: waitMs } = require('timers/promises');
const { expect } = require('@playwright/test');
const { SecurityApi } = require('./security-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { Logger, sc } = require('@reldens/utils');

class RoomMovementApi
{

    static POLL_MS = 100;
    static DESCRIBED_STEPS = 20;
    static VELOCITY_STEP_TOLERANCE = 1;
    static RECORDED_STEPS_SHOWN = 40;

    static async waitForPlayerStill(gameConfig, roomName, playerName, timeout)
    {
        let stopped = await RoomMovementApi.collectTrail(
            async () => RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
            (snapshot) => 0 === snapshot.pathSteps && 0 === snapshot.velocityX && 0 === snapshot.velocityY,
            timeout
        );
        expect(stopped.done, 'The player '+playerName+' must stand still: '+sc.toJsonString(stopped.last)).toBe(true);
        return stopped.last;
    }

    static async waitForPlayerSettled(gameConfig, roomName, playerName, timeout)
    {
        let previous = false;
        let settled = await RoomMovementApi.collectTrail(
            async () => RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
            (snapshot) => {
                let isSettled = Boolean(previous) && previous.x === snapshot.x && previous.y === snapshot.y;
                previous = snapshot;
                return isSettled;
            },
            timeout
        );
        expect(settled.done, 'The player '+playerName+' body must settle: '+sc.toJsonString(settled.last)).toBe(true);
        return settled.last;
    }

    static async collectRecordedTrail(recordedPlayer, startMovement, fetchSnapshot, isDone, timeout)
    {
        let recording = await SecurityApi.request(recordedPlayer.gameConfig, 'POST', '/api/e2e/movement/steps-record', {
            roomName: recordedPlayer.roomName,
            playerName: recordedPlayer.playerName
        });
        expect(sc.get(recording, 'recording', false), 'The movement steps are recorded: '+sc.get(recording, 'error', ''))
            .toBe(true);
        await startMovement();
        let movement = await RoomMovementApi.collectTrail(fetchSnapshot, isDone, timeout);
        let recorded = await SecurityApi.request(recordedPlayer.gameConfig, 'GET', '/api/e2e/movement/steps-recorded');
        movement.steps = RoomMovementApi.dropRepeatedSteps(sc.get(recorded, 'steps', [])).slice(
            -RoomMovementApi.RECORDED_STEPS_SHOWN
        );
        return movement;
    }

    static describeLastSteps(trail)
    {
        return 'column, row, velocity and path steps: '+sc.toJsonString(RoomMovementApi.dropRepeatedSteps(trail.map(
            (step) => [step.currentCol, step.currentRow, step.velocityX, step.velocityY, step.pathSteps]
        )).slice(-RoomMovementApi.DESCRIBED_STEPS));
    }

    static async expectVelocity(fetchPlayer, expectedVelocity, message, timeout, isAbsolute = false)
    {
        await expect.poll(async () => [await fetchPlayer()].map((player) => {
            let reading = {velocity: [player.velocityX, player.velocityY].map((value) => isAbsolute ? Math.abs(value) : value)};
            reading.isAtSpeed = [reading.velocity[0] - expectedVelocity.x, reading.velocity[1] - expectedVelocity.y].map(
                (difference) => RoomMovementApi.VELOCITY_STEP_TOLERANCE >= Math.abs(difference)
            );
            return reading;
        }).pop(), {message, timeout}).toEqual(expect.objectContaining({isAtSpeed: [true, true]}));
    }

    static async describeWalkFailure(walkContext, trail)
    {
        return 'the client send result '+sc.toJsonString(walkContext.lastSent)+', the last server steps ('
            +RoomMovementApi.describeLastSteps(trail)+') and the movement messages the server got '
            +sc.toJsonString(await GameplayE2eStateApi.fetchMovementMessages(walkContext.gameConfig, walkContext.playerName));
    }

    static dropRepeatedSteps(steps)
    {
        let changedSteps = [];
        for(let step of steps){
            if(0 < changedSteps.length && sc.toJsonString(changedSteps[changedSteps.length - 1]) === sc.toJsonString(step)){
                continue;
            }
            changedSteps.push(step);
        }
        return changedSteps;
    }

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

    static async fetchClearLineTile(gameConfig, roomName, playerName, distances)
    {
        let clearLine = await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/movement/clear-line-tile?'+new URLSearchParams({roomName, playerName, distances: distances.join(',')}).toString()
        );
        if(clearLine.error){
            Logger.error('[room-movement-api] '+clearLine.error);
        }
        return sc.get(clearLine, 'tile', false);
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

    static async placePlayer(gameConfig, roomName, playerName, position)
    {
        return await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/movement/player-place',
            {roomName, playerName, x: position.x, y: position.y}
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
        let deadline = Date.now() + timeout;
        for(let poll = 0; poll < maxPolls && (0 === poll || Date.now() < deadline); poll++){
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
