/**
 *
 * Reldens - Test Movement Gravity
 *
 * Tests the player movement in the sample gravity room (exclusive group, its return point without a previous room
 * stored as the player state before the login and the movement messages recorded on the server; the room customData
 * turns the gravity and the pass walls from below on and the path finder off, and the walls used are the rows of the
 * sample map ground-collisions layer: the floor on row 19 (column 2 has no wall above it until row 9), a platform on row
 * 16 columns 15 to 19 and a platform on row 4 columns 24 to 28, the 25 pixels player body stands one row above each
 * one): the down key held sends its direction and
 * moves nobody; the up key jumps the player standing on the floor and it lands back on it; a player walking off the row
 * 4 platform ledge falls, its stop in the air stops only the horizontal move and it lands on a lower wall; the up key
 * held under the row 16 platform jumps the player up through it and it stands on top of it; and a canvas click sends no
 * pointer move while a pointer move sent with tiles finds no path and moves nobody.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementGravity
{

    static GRAVITY_ROOM = 'reldens-gravity';
    static TILE = 32;
    static PLACEMENT_HEIGHT = 12.5;
    static FLOOR = {centerX: 80, top: 608, standingRow: 18, label: 'the floor'};
    static FLOOR_UNDER_PLATFORM = {centerX: 560, top: 608, standingRow: 18, label: 'the floor under the platform'};
    static UPPER_PLATFORM = {centerX: 560, top: 512, standingRow: 15, label: 'the platform it passed from below'};
    static HIGH_PLATFORM = {centerX: 816, top: 128, standingRow: 3, label: 'the high platform'};
    static HOLD_MS = 600;
    static QUIET_MS = 1000;
    static CAMERA_POLL_MS = 200;
    static CLICK_TILES = 4;
    static FAST_POLL = [50];
    static STOP_MESSAGE = {dir: '', act: GameConst.STOP};
    static POINTER_MESSAGE = {dir: '', act: GameConst.POINTER};

    static async enterGravityRoom(context)
    {
        await ChangePointsSteps.storeRoomArrival(
            context,
            await ChangePointsSteps.loadTopology(context.gameConfig),
            TestMovementGravity.GRAVITY_ROOM
        );
        return await MovementScenario.enterReadyRoom(context, TestMovementGravity.GRAVITY_ROOM, false);
    }

    static async releaseUpAndStandOn(context, walkContext, start, wall)
    {
        await context.page.keyboard.up('ArrowUp');
        let landed = await TestMovementGravity.waitStandingOnRow(
            walkContext,
            wall.standingRow,
            'The released up key leaves the player standing on '+wall.label
        );
        expect(landed.x, 'The jump keeps the player column').toBe(start.x);
        await TestMovementGravity.expectMessages(
            walkContext,
            [{dir: GameConst.UP, act: ''}, TestMovementGravity.STOP_MESSAGE],
            'The up key sends its direction once and its release the stop'
        );
    }

    static async waitStandingOnRow(walkContext, row, message)
    {
        let standing = await RoomMovementApi.collectTrail(
            walkContext.fetchPlayer,
            (player) => walkContext.isStill(player) && row === player.currentRow,
            TimeConstants.SERVER_RESPONSE
        );
        expect(standing.done, message+': '+sc.toJsonString(standing.last)).toBe(true);
        return standing.last;
    }

    static async placeOnWall(walkContext, wall)
    {
        let placement = await RoomMovementApi.placePlayer(
            walkContext.gameConfig,
            walkContext.roomName,
            walkContext.playerName,
            {x: wall.centerX, y: wall.top - TestMovementGravity.PLACEMENT_HEIGHT}
        );
        expect(placement.position, 'The player is placed over the wall: '+placement.error).toBeTruthy();
        return await TestMovementGravity.waitStandingOnRow(walkContext, wall.standingRow, 'The player stands on the wall');
    }

    static async expectMessages(walkContext, expectedMessages, message)
    {
        expect(
            await GameplayE2eStateApi.fetchMovementMessages(walkContext.gameConfig, walkContext.playerName),
            message
        ).toEqual(expectedMessages);
    }

    static async runDownAndJumpTest(context)
    {
        let walkContext = await TestMovementGravity.enterGravityRoom(context);
        let start = await TestMovementGravity.placeOnWall(walkContext, TestMovementGravity.FLOOR);
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowDown');
        await context.page.waitForTimeout(TestMovementGravity.HOLD_MS);
        await context.page.keyboard.up('ArrowDown');
        await MovementScenario.expectStillWithMessages(
            walkContext,
            [{dir: GameConst.DOWN, act: ''}, TestMovementGravity.STOP_MESSAGE],
            'The down key sends its direction once and its release the stop'
        );
        let afterDown = await walkContext.fetchPlayer();
        expect([afterDown.x, afterDown.y], 'The down key moves nobody').toEqual([start.x, start.y]);
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowUp');
        await expect.poll(
            async () => start.y - (await walkContext.fetchPlayer()).y,
            {message: 'The up key jumps the player off the floor', timeout: TimeConstants.SERVER_RESPONSE, intervals: TestMovementGravity.FAST_POLL}
        ).toBeGreaterThanOrEqual(TestMovementGravity.TILE);
        await TestMovementGravity.releaseUpAndStandOn(context, walkContext, start, TestMovementGravity.FLOOR);
    }

    static async runLedgeFallTest(context)
    {
        let walkContext = await TestMovementGravity.enterGravityRoom(context);
        let start = await TestMovementGravity.placeOnWall(walkContext, TestMovementGravity.HIGH_PLATFORM);
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowLeft');
        await expect.poll(
            async () => (await walkContext.fetchPlayer()).velocityY,
            {message: 'The player walks off the ledge and falls', timeout: TimeConstants.SERVER_RESPONSE, intervals: TestMovementGravity.FAST_POLL}
        ).toBeGreaterThan(0);
        await context.page.keyboard.up('ArrowLeft');
        await expect.poll(
            async () => MovementScenario.fetchVelocitySigns(walkContext),
            {message: 'The stop in the air stops only the horizontal move', timeout: TimeConstants.SERVER_RESPONSE, intervals: TestMovementGravity.FAST_POLL}
        ).toEqual([0, 1]);
        let landed = await RoomMovementApi.waitForPlayerStill(
            context.gameConfig,
            walkContext.roomName,
            walkContext.playerName,
            TimeConstants.SERVER_RESPONSE
        );
        expect(landed.y - start.y, 'The player lands on a lower wall').toBeGreaterThan(TestMovementGravity.TILE);
        await TestMovementGravity.expectMessages(
            walkContext,
            [{dir: GameConst.LEFT, act: ''}, TestMovementGravity.STOP_MESSAGE],
            'The walk sends the left direction once and its release the stop'
        );
    }

    static async runPassWallFromBelowTest(context)
    {
        let walkContext = await TestMovementGravity.enterGravityRoom(context);
        let start = await TestMovementGravity.placeOnWall(walkContext, TestMovementGravity.FLOOR_UNDER_PLATFORM);
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowUp');
        await expect.poll(
            async () => (await walkContext.fetchPlayer()).currentRow,
            {message: 'The held up key jumps the player into the platform', timeout: TimeConstants.SERVER_RESPONSE, intervals: TestMovementGravity.FAST_POLL}
        ).toBeLessThanOrEqual(TestMovementGravity.UPPER_PLATFORM.standingRow);
        await TestMovementGravity.releaseUpAndStandOn(context, walkContext, start, TestMovementGravity.UPPER_PLATFORM);
    }

    static async runPointerTest(context)
    {
        let walkContext = await TestMovementGravity.enterGravityRoom(context);
        let start = await TestMovementGravity.placeOnWall(walkContext, TestMovementGravity.FLOOR);
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await Navigation.waitForCameraSettled(context.page, TimeConstants.SCENE_LOAD, TestMovementGravity.CAMERA_POLL_MS);
        expect(
            await Navigation.navigateToWorldPoint(
                context.page,
                start.x + TestMovementGravity.CLICK_TILES * TestMovementGravity.TILE,
                start.y,
                'right'
            ),
            'The floor tile is shown on the canvas'
        ).toBe(true);
        await context.page.waitForTimeout(TestMovementGravity.QUIET_MS);
        await TestMovementGravity.expectMessages(
            walkContext,
            [TestMovementGravity.STOP_MESSAGE],
            'The canvas click sends no pointer move, only the mouse release stop'
        );
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await RoomMessagesRecorder.sendMessage(context.page, {
            act: GameConst.POINTER,
            column: start.currentCol + TestMovementGravity.CLICK_TILES,
            row: start.currentRow
        });
        await context.page.waitForTimeout(TestMovementGravity.QUIET_MS);
        await TestMovementGravity.expectMessages(
            walkContext,
            [TestMovementGravity.POINTER_MESSAGE],
            'The pointer move reaches the room'
        );
        let end = await walkContext.fetchPlayer();
        expect([end.x, end.y, end.pathSteps], 'The pointer move finds no path and moves nobody').toEqual([
            start.x,
            start.y,
            0
        ]);
    }

    static run()
    {
        test.describe('Movement Gravity', () => {
            test('a gravity room player ignores the down key and the up key jumps it back to the floor', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementGravity.runDownAndJumpTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a player walking off a gravity room ledge falls and its stop in the air keeps it falling', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementGravity.runLedgeFallTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the up key held under a gravity room platform jumps the player through it to stand on top', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementGravity.runPassWallFromBelowTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a gravity room canvas click sends no pointer move and a pointer move moves nobody', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementGravity.runPointerTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementGravity.run();
