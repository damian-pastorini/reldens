/**
 *
 * Reldens - Test Movement World Bounds
 *
 * Tests the own player at every border of the town map (world group, the town moving objects paused): the player is
 * placed on the free walkable tile closest to each border (RoomBorderPlacement, inside the map) and pushed against
 * that border with its direction, then stopped. The server body stays inside the map (the border walls stop it) and,
 * once the client settled, with the sample collideWorldBounds on the sprite body stays inside the world bounds and the
 * camera is clamped on that border of the map; with collideWorldBounds off (set before the engine starts) the sprite
 * follows the server body position on every border; and a pointer move, from the right and the bottom borders, to the
 * last map column or row and to a tampered column or row equal to the map size keeps the server body inside the map
 * and stops it (the path finder grid column and row past the map are not walkable).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementWorldBounds
{

    static BORDER_DIRECTIONS = {top: GameConst.UP, bottom: GameConst.DOWN, left: GameConst.LEFT, right: GameConst.RIGHT};
    static PUSH_MS = 600;
    static POINTER_BORDERS = ['right', 'bottom'];
    static SETTLE_POLL_MS = 200;
    static READ_CLIENT_VIEW = () => {
        let playerEngine = window.reldens.getCurrentPlayer();
        let sprite = window.reldens.getCurrentPlayerAnimation();
        if(!sprite){
            return false;
        }
        return {
            position: [Math.round(sprite.x + playerEngine.leftOff), Math.round(sprite.y + playerEngine.topOff)],
            body: [sprite.body.left, sprite.body.top, sprite.body.right, sprite.body.bottom].map(Math.round),
            camera: ['x', 'y', 'right', 'bottom'].map(
                (viewKey) => Math.round(window.reldens.getActiveScene().cameras.main.worldView[viewKey])
            )
        };
    };

    static async placeOnBorder(context, walkContext, borderName)
    {
        let placed = await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/room-borders/place-player', {
            roomName: Login.TOWN_ROOM_NAME,
            playerName: walkContext.playerName,
            border: borderName
        });
        expect(placed.tile, 'The player is placed on the '+borderName+' border: '+placed.error).toBeTruthy();
        return placed;
    }

    static async waitForStill(context, walkContext)
    {
        await RoomMovementApi.waitForPlayerStill(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName,
            TimeConstants.SERVER_RESPONSE
        );
    }

    static async pointerMovement(context, walkContext, column, row)
    {
        await RoomMessagesRecorder.sendMessage(context.page, {act: GameConst.POINTER, column, row});
        return await RoomMovementApi.collectTrail(
            walkContext.fetchPlayer,
            walkContext.isStill,
            TimeConstants.forLongRun(TimeConstants.NAVIGATION, context.longRun)
        );
    }

    static async pointEdgeTiles(context, walkContext, placed, pointerTiles)
    {
        let stopped = [];
        let outOfMapPositions = 0;
        for(let pointerTile of pointerTiles){
            let movement = await TestMovementWorldBounds.pointerMovement(context, walkContext, ...pointerTile);
            stopped.push(movement.done);
            outOfMapPositions += movement.trail.filter(
                (snapshot) => 0 > snapshot.x || snapshot.x > placed.mapSize.width
                    || 0 > snapshot.y || snapshot.y > placed.mapSize.height
            ).length;
        }
        return {stopped, outOfMapPositions};
    }

    static async runEdgePointersTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        let results = {};
        for(let borderName of TestMovementWorldBounds.POINTER_BORDERS){
            let placed = await TestMovementWorldBounds.placeOnBorder(context, walkContext, borderName);
            let edge = 'right' === borderName
                ? placed.mapSize.width / placed.tileSize.width
                : placed.mapSize.height / placed.tileSize.height;
            results[borderName] = await TestMovementWorldBounds.pointEdgeTiles(
                context,
                walkContext,
                placed,
                [edge - 1, edge].map(
                    (edgeTile) => 'right' === borderName ? [edgeTile, placed.tile[1]] : [placed.tile[0], edgeTile]
                )
            );
        }
        expect(
            results,
            'A pointer to the last map tile or to the map size stops the body and no pointer takes it out of the map: '
                +sc.toJsonString(results)
        ).toEqual({
            right: {stopped: [true, true], outOfMapPositions: 0},
            bottom: {stopped: [true, true], outOfMapPositions: 0}
        });
    }

    static async pushIntoBorder(context, walkContext, borderName)
    {
        let placed = await TestMovementWorldBounds.placeOnBorder(context, walkContext, borderName);
        await RoomMessagesRecorder.sendMessage(context.page, {dir: TestMovementWorldBounds.BORDER_DIRECTIONS[borderName]});
        await context.page.waitForTimeout(TestMovementWorldBounds.PUSH_MS);
        await RoomMessagesRecorder.sendMessage(context.page, {act: GameConst.STOP});
        await TestMovementWorldBounds.waitForStill(context, walkContext);
        let previousView = '';
        await expect.poll(
            async () => {
                let currentView = sc.toJsonString(await context.page.evaluate(TestMovementWorldBounds.READ_CLIENT_VIEW));
                let isSettled = currentView === previousView;
                previousView = currentView;
                return isSettled;
            },
            {
                message: 'The client settles on the '+borderName+' border',
                timeout: TimeConstants.SERVER_RESPONSE,
                intervals: [TestMovementWorldBounds.SETTLE_POLL_MS]
            }
        ).toBe(true);
        let server = await RoomMovementApi.fetchPlayer(context.gameConfig, Login.TOWN_ROOM_NAME, walkContext.playerName);
        expect(
            [
                server.velocityX,
                server.velocityY,
                0 <= server.x && server.x <= placed.mapSize.width,
                0 <= server.y && server.y <= placed.mapSize.height
            ],
            'The '+borderName+' border wall keeps the stopped server body inside the map'
        ).toEqual([0, 0, true, true]);
        return {placed, server, view: sc.parseJson(previousView)};
    }

    static async runBoundsOnTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        for(let borderName of Object.keys(TestMovementWorldBounds.BORDER_DIRECTIONS)){
            let pushed = await TestMovementWorldBounds.pushIntoBorder(context, walkContext, borderName);
            let mapSize = pushed.placed.mapSize;
            let [left, top, right, bottom] = pushed.view.body;
            expect(
                [0 <= left, 0 <= top, right <= mapSize.width, bottom <= mapSize.height],
                'The sprite body stays inside the world bounds on the '+borderName+' border'
            ).toEqual([true, true, true, true]);
            let cameraEdges = {
                top: pushed.view.camera[1],
                bottom: pushed.view.camera[3] - mapSize.height,
                left: pushed.view.camera[0],
                right: pushed.view.camera[2] - mapSize.width
            };
            expect(cameraEdges[borderName], 'The camera is clamped on the '+borderName+' map border').toBe(0);
        }
    }

    static async runBoundsOffTest(context)
    {
        await InitialClientConfig.overrideBeforeEngine(context.page, 'client/players/animations', {
            collideWorldBounds: false
        });
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        expect(
            await context.page.evaluate(() => window.reldens.getCurrentPlayer().collideWorldBounds),
            'The player engine starts with collideWorldBounds off'
        ).toBe(false);
        for(let borderName of Object.keys(TestMovementWorldBounds.BORDER_DIRECTIONS)){
            let pushed = await TestMovementWorldBounds.pushIntoBorder(context, walkContext, borderName);
            expect(
                pushed.view.position,
                'The sprite follows the server body stopped on the '+borderName+' border'
            ).toEqual([pushed.server.x, pushed.server.y]);
        }
    }

    static run()
    {
        test.describe('Movement World Bounds', () => {
            test('the sprite stays inside the world bounds and the camera clamps on every map border', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementWorldBounds.runBoundsOnTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with collideWorldBounds off the server walls stop the body and the sprite follows it', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementWorldBounds.runBoundsOffTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a pointer to the last map column or row, or to the map size, keeps the body inside the map', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementWorldBounds.runEdgePointersTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementWorldBounds.run();
