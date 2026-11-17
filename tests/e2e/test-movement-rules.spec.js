/**
 *
 * Reldens - Test Movement Rules
 *
 * Tests the server movement rules with the movement messages a client sends (world group, the town moving objects paused
 * and the player placed on the town return point before every walk, restored by the group reset): every direction moves
 * the player body on its axis with its sign and keeps the other axis, the stop message stands it still; two directions
 * at once move it diagonally at the movement speed normalized on both axes and four directions at once from a still
 * body keep that normalized speed on both axes (the server timers order of the four held directions picks the signs);
 * a pointer move with huge, non numeric or fractional tiles leaves the player on its tile and the
 * room keeps moving it; and a burst of direction messages carrying position and time values moves the body only at
 * the movement speed, never to the sent position.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementRules
{

    static DIRECTIONS = [
        {dir: GameConst.RIGHT, axis: 'x', otherAxis: 'y', sign: 1},
        {dir: GameConst.LEFT, axis: 'x', otherAxis: 'y', sign: -1},
        {dir: GameConst.DOWN, axis: 'y', otherAxis: 'x', sign: 1},
        {dir: GameConst.UP, axis: 'y', otherAxis: 'x', sign: -1}
    ];
    static TAMPERED_POINTERS = [{column: 99999, row: 99999}, {column: 'a', row: 'b'}, {column: 1.5, row: 2.5}];
    static BURST_MESSAGES = 50;
    static TAMPERED_OFFSET = 5000;
    static QUIET_MS = 1500;
    static WALK_DISTANCES = [4, 3, 2];

    static async enterTown(context)
    {
        let gameConfig = context.gameConfig;
        let playerName = gameConfig.e2ePlayerName;
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        let walkContext = MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, playerName, context.longRun);
        await MovementScenario.pauseMovingObjects(gameConfig, Login.TOWN_ROOM_NAME);
        return Object.assign(walkContext, {
            movementSpeed: (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName)).movementSpeed
        });
    }

    static async stopAndWaitStill(context, walkContext)
    {
        await RoomMessagesRecorder.sendMessage(context.page, {act: GameConst.STOP});
        return await RoomMovementApi.waitForPlayerStill(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName,
            TimeConstants.SERVER_RESPONSE
        );
    }

    static async expectVelocity(walkContext, expectedVelocity, message)
    {
        await expect.poll(
            async () => await walkContext.fetchPlayer(),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expect.objectContaining({velocityX: expectedVelocity.x, velocityY: expectedVelocity.y}));
    }

    static async runDirectionsTest(context)
    {
        let walkContext = await TestMovementRules.enterTown(context);
        for(let direction of TestMovementRules.DIRECTIONS){
            await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
            let start = await walkContext.fetchPlayer();
            await RoomMessagesRecorder.sendMessage(context.page, {dir: direction.dir});
            await expect.poll(
                async () => Math.sign((await walkContext.fetchPlayer())[direction.axis] - start[direction.axis]),
                {message: 'The '+direction.dir+' direction moves on its axis and sign', timeout: TimeConstants.SERVER_RESPONSE}
            ).toBe(direction.sign);
            let end = await TestMovementRules.stopAndWaitStill(context, walkContext);
            expect(end[direction.otherAxis], 'The '+direction.dir+' direction keeps the other axis').toBe(
                start[direction.otherAxis]
            );
        }
    }

    static async runSimultaneousDirectionsTest(context)
    {
        let walkContext = await TestMovementRules.enterTown(context);
        let diagonalSpeed = Math.round(walkContext.movementSpeed * Math.SQRT1_2);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        await RoomMessagesRecorder.sendMessages(context.page, [{dir: GameConst.RIGHT}, {dir: GameConst.DOWN}]);
        await TestMovementRules.expectVelocity(
            walkContext,
            {x: diagonalSpeed, y: diagonalSpeed},
            'Two directions at once move diagonally at the normalized movement speed'
        );
        await TestMovementRules.stopAndWaitStill(context, walkContext);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        await RoomMessagesRecorder.sendMessages(context.page, TestMovementRules.DIRECTIONS.map((direction) => ({
            dir: direction.dir
        })));
        await expect.poll(
            async () => [await walkContext.fetchPlayer()].map((player) => [
                Math.abs(player.velocityX),
                Math.abs(player.velocityY)
            ]).pop(),
            {message: 'Four directions at once keep the normalized movement speed', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([diagonalSpeed, diagonalSpeed]);
        await TestMovementRules.stopAndWaitStill(context, walkContext);
    }

    static async runTamperedPointersTest(context)
    {
        let walkContext = await TestMovementRules.enterTown(context);
        for(let tamperedPointer of TestMovementRules.TAMPERED_POINTERS){
            await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
            let start = await walkContext.fetchPlayer();
            await RoomMessagesRecorder.sendMessage(context.page, {act: GameConst.POINTER, x: start.x, y: start.y, ...tamperedPointer});
            await context.page.waitForTimeout(TestMovementRules.QUIET_MS);
            let after = await walkContext.fetchPlayer();
            expect(
                [after.currentCol, after.currentRow, after.pathSteps],
                'The tampered pointer '+tamperedPointer.column+','+tamperedPointer.row+' leaves the player on its tile'
            ).toEqual([start.currentCol, start.currentRow, 0]);
        }
        await MovementScenario.walkClearLine(
            context.page,
            walkContext,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName,
            TestMovementRules.WALK_DISTANCES
        );
    }

    static async runTamperedDirectionsTest(context)
    {
        let walkContext = await TestMovementRules.enterTown(context);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let start = await walkContext.fetchPlayer();
        let offset = TestMovementRules.TAMPERED_OFFSET;
        await RoomMessagesRecorder.sendMessages(context.page, Array.from(
            {length: TestMovementRules.BURST_MESSAGES},
            () => ({dir: GameConst.RIGHT, x: start.x + offset, y: start.y + offset, time: 0})
        ));
        await TestMovementRules.expectVelocity(
            walkContext,
            {x: walkContext.movementSpeed, y: 0},
            'A burst of direction messages moves the body only at the movement speed'
        );
        let end = await TestMovementRules.stopAndWaitStill(context, walkContext);
        expect(end.y, 'The sent position does not move the body').toBe(start.y);
        expect(end.x, 'The body never jumps to the sent position').toBeLessThan(start.x + offset);
    }

    static run()
    {
        test.describe('Movement Rules', () => {
            test('every direction moves the player on its axis and sign and the stop stands it still', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementRules.runDirectionsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('two and four directions at once move diagonally at the normalized movement speed', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementRules.runSimultaneousDirectionsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('tampered pointer tiles leave the player on its tile and the room keeps moving it', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementRules.runTamperedPointersTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a burst of direction messages with position values moves the body only at the movement speed', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementRules.runTamperedDirectionsTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementRules.run();
