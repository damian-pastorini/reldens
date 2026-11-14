/**
 *
 * Reldens - Test Movement Change Points
 *
 * Tests how a player gets into a change point (exclusive group, the player logs in the town and is placed below the
 * change point it walks into): walking into the forest change point with the up key held arrives standing still on the
 * forest return point (its sprite too, with no leftover movement) and walks again once the scene fade ends (the held key repeats its key down, as a real held key
 * does, the keys of the new scene only see the key events sent after they exist); a pointer move onto that change
 * point tile finds no path, the change point tiles are blocked on the path finder grid, so the player stays; and the
 * town house door object, stored on the change point tile of the house with no collision response, is walked through
 * from the town return point of the house into the house.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Navigation } = require('./helpers/navigation');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementChangePoints
{

    static SETTLE_MS = 1500;
    static DOOR_KEY = 'door_house_3';
    static DOOR_HOUSE_ROOM = 'reldens-house-1';

    static async enterBelowForestChangePoint(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let changePointTile = [
            Math.floor(Login.FOREST_TRANSITION_X / Navigation.TILE_SIZE),
            Math.floor(Login.FOREST_TRANSITION_Y / Navigation.TILE_SIZE)
        ];
        let placement = await RoomMovementApi.placePlayer(context.gameConfig, Login.TOWN_ROOM_NAME, player.playerName, {
            x: changePointTile[0] * Navigation.TILE_SIZE + Navigation.TILE_SIZE / 2,
            y: (changePointTile[1] + 1) * Navigation.TILE_SIZE + Navigation.TILE_SIZE / 2
        });
        expect(placement.position, 'The player stands below the forest change point: '+placement.error).toBeTruthy();
        return {
            player,
            changePointTile,
            arrival: ChangePointsSteps.fetchArrival(
                await ChangePointsSteps.loadTopology(context.gameConfig),
                Login.FOREST_ROOM_NAME,
                Login.TOWN_ROOM_NAME
            ),
            fetchForestPlayer: async () => RoomMovementApi.fetchPlayer(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                player.playerName
            )
        };
    }

    static async expectStillOnArrival(scenario, message)
    {
        await expect.poll(
            async () => Boolean(await scenario.fetchForestPlayer()),
            {message: 'The player joins the forest', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        let arrived = await scenario.fetchForestPlayer();
        expect(
            [arrived.x, arrived.y, arrived.velocityX, arrived.velocityY, arrived.pathSteps],
            message
        ).toEqual([scenario.arrival.x, scenario.arrival.y, 0, 0, 0]);
        return arrived;
    }

    static async runHeldKeyChangePointTest(context)
    {
        let scenario = await TestMovementChangePoints.enterBelowForestChangePoint(context);
        let page = scenario.player.page;
        await page.keyboard.down('ArrowUp');
        await Navigation.waitForRoom(page, Login.FOREST_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        await page.keyboard.down('ArrowUp');
        let arrived = await TestMovementChangePoints.expectStillOnArrival(
            scenario,
            'The player walking into the change point arrives standing still on the return point'
        );
        expect(
            await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
                page,
                await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId),
                {x: scenario.arrival.x, y: scenario.arrival.y},
                TimeConstants.SERVER_RESPONSE
            ),
            'The arrival sprite stands on the return point with no leftover movement'
        ).toBe(true);
        await expect.poll(
            async () => arrived.y - [await page.keyboard.down('ArrowUp'), await scenario.fetchForestPlayer()].pop().y,
            {message: 'The key still held walks the player once the scene fade ends', timeout: TimeConstants.SCENE_LOAD}
        ).toBeGreaterThan(0);
        await page.keyboard.up('ArrowUp');
        await RoomMovementApi.waitForPlayerStill(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            scenario.player.playerName,
            TimeConstants.SERVER_RESPONSE
        );
    }

    static async runPointerOnChangePointTest(context)
    {
        let scenario = await TestMovementChangePoints.enterBelowForestChangePoint(context);
        let fetchTownPlayer = async () => RoomMovementApi.fetchPlayer(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            scenario.player.playerName
        );
        let start = await fetchTownPlayer();
        await RoomMessagesRecorder.sendMessage(scenario.player.page, {
            act: GameConst.POINTER,
            column: scenario.changePointTile[0],
            row: scenario.changePointTile[1]
        });
        await scenario.player.page.waitForTimeout(TestMovementChangePoints.SETTLE_MS);
        let after = await fetchTownPlayer();
        expect(
            [after.x, after.y, after.pathSteps, await Navigation.getCurrentRoomName(scenario.player.page)],
            'The change point tile is blocked on the path finder grid, the pointer move finds no path'
        ).toEqual([start.x, start.y, 0, Login.TOWN_ROOM_NAME]);
    }

    static async runDoorPassTest(context)
    {
        let gameConfig = context.gameConfig;
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        let door = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objects', {
            client_key: TestMovementChangePoints.DOOR_KEY
        })).shift();
        expect(
            [
                ChangePointsSteps.fetchTiles(topology, Login.TOWN_ROOM_NAME, TestMovementChangePoints.DOOR_HOUSE_ROOM)
                    .includes(String(door.tile_index)),
                sc.toJson(door.private_params).collisionResponse
            ],
            'The house door stands on the change point tile of the house with no collision response'
        ).toEqual([true, false]);
        await ChangePointsSteps.walkUpIntoRoom(
            context,
            player,
            topology,
            Login.TOWN_ROOM_NAME,
            TestMovementChangePoints.DOOR_HOUSE_ROOM
        );
    }

    static run()
    {
        test.describe('Movement Change Points', () => {
            test('a player walking into a change point with a key held arrives still and walks again after the fade', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementChangePoints.runHeldKeyChangePointTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a pointer move onto a change point tile finds no path and keeps the player in the room', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementChangePoints.runPointerOnChangePointTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a player walks through a house door without collision response into the house', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementChangePoints.runDoorPassTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementChangePoints.run();
