/**
 *
 * Reldens - Test Teleport NPC Destinations
 *
 * Tests the teleport NPC dialog options (exclusive group, the first player next to the town teleport NPC with its
 * dialog open, TeleportNpcSteps, an e2e destination option added to the live NPC for the group): the stored "Nowhere"
 * option has no destination, so it closes the dialog and relocates nothing; a destination with a position and a
 * direction arrives on them; a destination with an invalid position and direction arrives on the destination room
 * default return point; a destination in the same room places the body with no scene change, shown on the own client
 * and on another client of the town; a destination room that is not a room name shows the invalid destination message,
 * like a room without allowGuest chosen by a guest (the guest rooms computed with allowOnRooms off, the sample allows
 * the guests on every room);
 * an option value that is not in the dialog options relocates nothing (its message shows the snippet key, ISSUE #350);
 * and an option chosen once the
 * player is out of the NPC reach closes the dialog and relocates nothing.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { Navigation } = require('./helpers/navigation');
const { CharacterCreation } = require('./helpers/character-creation');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeleportNpcDestinations
{

    static NOT_AN_OPTION_VALUE = 999;
    static NOT_A_ROOM_NAME = 123;
    static NPC_MINIMUM_TILES = 2;
    static NOT_GUEST_ROOM_NAME = 'reldens-house-1-2d-floor';

    static async enterWithDialog(context)
    {
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        return await TeleportNpcSteps.openDialog(context, context.page);
    }

    static async fetchTownPosition(context)
    {
        let player = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.TOWN_ROOM_NAME, context.gameConfig.e2ePlayerName);
        return [player.scene, player.x, player.y];
    }

    static async expectStayedInTown(context, before, message)
    {
        await context.page.waitForTimeout(TimeConstants.ACTION);
        expect(
            [await Navigation.getCurrentRoomName(context.page), ...await TestTeleportNpcDestinations.fetchTownPosition(context)],
            message
        ).toEqual([Login.TOWN_ROOM_NAME, ...before]);
    }

    static async runNowhereOptionTest(context)
    {
        let npc = await TestTeleportNpcDestinations.enterWithDialog(context);
        let before = await TestTeleportNpcDestinations.fetchTownPosition(context);
        await TeleportNpcSteps.chooseOption(npc, TeleportNpcSteps.NOWHERE_OPTION_VALUE);
        await expect(npc.dialog, 'The option without destination closes the dialog').toHaveCount(0, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
        await TestTeleportNpcDestinations.expectStayedInTown(context, before, 'The option without destination relocates nothing');
    }

    static async teleportToForest(context, destinationPosition)
    {
        let npc = await TestTeleportNpcDestinations.enterWithDialog(context);
        let optionValue = await TeleportNpcSteps.addDestination(
            context,
            npc,
            Object.assign({room: Login.FOREST_ROOM_NAME}, destinationPosition)
        );
        await TeleportNpcSteps.chooseOption(npc, optionValue);
        await Navigation.waitForRoom(context.page, Login.FOREST_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        let arrived = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName);
        return [arrived.x, arrived.y, arrived.dir];
    }

    static async runPositionDestinationTest(context)
    {
        let returnPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(context.gameConfig, Login.FOREST_ROOM_NAME);
        let destination = {x: returnPoint.x + Navigation.TILE_SIZE, y: returnPoint.y, dir: GameConst.LEFT};
        expect(
            await TestTeleportNpcDestinations.teleportToForest(context, destination),
            'The destination position and direction are used on the arrival'
        ).toEqual([destination.x, destination.y, destination.dir]);
    }

    static async runInvalidPositionTest(context)
    {
        let returnPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(context.gameConfig, Login.FOREST_ROOM_NAME);
        expect(
            await TestTeleportNpcDestinations.teleportToForest(context, {
                x: 'e2e-not-a-number',
                y: returnPoint.y,
                dir: 'e2e-not-a-direction'
            }),
            'An invalid position and direction arrive on the destination room default return point'
        ).toEqual([returnPoint.x, returnPoint.y, returnPoint.dir]);
    }

    static async runSameRoomTest(context)
    {
        let gameConfig = context.gameConfig;
        await Login.loginRootPlayer(context.secondPage, gameConfig, context.longRun, '2');
        await MovementScenario.placePlayerNextToNpc(
            context.secondPage,
            Object.assign(
                {npcKey: gameConfig.e2eNpcKey},
                MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName2, context.longRun)
            ),
            TestTeleportNpcDestinations.NPC_MINIMUM_TILES
        );
        let npc = await TestTeleportNpcDestinations.enterWithDialog(context);
        let returnPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(gameConfig, Login.TOWN_ROOM_NAME);
        let optionValue = await TeleportNpcSteps.addDestination(context, npc, {
            room: Login.TOWN_ROOM_NAME,
            x: returnPoint.x,
            y: returnPoint.y,
            dir: GameConst.LEFT
        });
        let sessionId = await context.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await TeleportNpcSteps.chooseOption(npc, optionValue);
        for(let clientPage of [context.page, context.secondPage]){
            expect(
                await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
                    clientPage,
                    sessionId,
                    {x: returnPoint.x, y: returnPoint.y},
                    TimeConstants.SERVER_RESPONSE
                ),
                'Every client of the town shows the player on the same room destination'
            ).toBe(true);
        }
        let placed = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName);
        expect(
            [await Navigation.getCurrentRoomName(context.page), placed.scene, placed.x, placed.y, placed.dir],
            'The same room destination places the body with no scene change'
        ).toEqual([Login.TOWN_ROOM_NAME, Login.TOWN_ROOM_NAME, returnPoint.x, returnPoint.y, GameConst.LEFT]);
    }

    static async runInvalidRoomTest(context)
    {
        let npc = await TestTeleportNpcDestinations.enterWithDialog(context);
        let before = await TestTeleportNpcDestinations.fetchTownPosition(context);
        let optionValue = await TeleportNpcSteps.addDestination(context, npc, {
            room: TestTeleportNpcDestinations.NOT_A_ROOM_NAME
        });
        await TeleportNpcSteps.chooseOption(npc, optionValue);
        await expect(npc.dialog, 'The destination that is not a room name shows the invalid destination message')
            .toContainText(ObjectsConst.DEFAULTS.TELEPORT_OBJECT.INVALID_DESTINATION_MESSAGE, {
                timeout: TimeConstants.SERVER_RESPONSE
            });
        await TestTeleportNpcDestinations.expectStayedInTown(context, before, 'The invalid destination relocates nothing');
    }

    static async runGuestDestinationTest(context)
    {
        await CharacterCreation.enterGuestInGame(context.page, context.longRun, Login.TOWN_ROOM_NAME);
        let npc = await TeleportNpcSteps.openDialog(context, context.page);
        let optionValue = await TeleportNpcSteps.addDestination(context, npc, {
            room: TestTeleportNpcDestinations.NOT_GUEST_ROOM_NAME
        });
        let guestRooms = (await SecurityApi.request(
            context.gameConfig,
            'POST',
            '/api/e2e/login-server/guest-rooms-allow-on-rooms',
            {allowOnRooms: false}
        )).guestRooms;
        expect(guestRooms.includes(TestTeleportNpcDestinations.NOT_GUEST_ROOM_NAME), 'The room is out of the guest rooms')
            .toBe(false);
        await TeleportNpcSteps.chooseOption(npc, optionValue);
        await expect(npc.dialog, 'A guest choosing a room without allowGuest gets the invalid destination message')
            .toContainText(ObjectsConst.DEFAULTS.TELEPORT_OBJECT.INVALID_DESTINATION_MESSAGE, {
                timeout: TimeConstants.SERVER_RESPONSE
            });
        await context.page.waitForTimeout(TimeConstants.ACTION);
        expect(await Navigation.getCurrentRoomName(context.page), 'The guest stays in the town').toBe(Login.TOWN_ROOM_NAME);
    }

    static async runInvalidOptionTest(context)
    {
        let npc = await TestTeleportNpcDestinations.enterWithDialog(context);
        let before = await TestTeleportNpcDestinations.fetchTownPosition(context);
        await TeleportNpcSteps.chooseOption(npc, TestTeleportNpcDestinations.NOT_AN_OPTION_VALUE);
        await TestTeleportNpcDestinations.expectStayedInTown(context, before, 'The invalid option relocates nothing');
    }

    static async runOutOfReachTest(context)
    {
        let npc = await TestTeleportNpcDestinations.enterWithDialog(context);
        await MovementScenario.placePlayerOnReturnPoint(
            context.page,
            MovementScenario.createWalkContext(context.gameConfig, Login.TOWN_ROOM_NAME, context.gameConfig.e2ePlayerName, context.longRun)
        );
        let before = await TestTeleportNpcDestinations.fetchTownPosition(context);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await expect(npc.dialog, 'The option chosen out of reach closes the dialog').toHaveCount(0, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
        await TestTeleportNpcDestinations.expectStayedInTown(context, before, 'The option chosen out of reach relocates nothing');
    }

    static run()
    {
        test.describe('Teleport NPC Destinations', () => {
            test('the option without destination closes the dialog and relocates nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runNowhereOptionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a destination with a position and a direction arrives on them', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runPositionDestinationTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a destination with an invalid position and direction arrives on the room default return point', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runInvalidPositionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a destination in the same room places the body with no scene change on every client', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runSameRoomTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a destination room that is not a room name shows the invalid destination message', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runInvalidRoomTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a guest choosing a destination room without allowGuest gets the invalid destination message', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runGuestDestinationTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an option value out of the dialog options relocates nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runInvalidOptionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an option chosen out of the NPC reach closes the dialog and relocates nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcDestinations.runOutOfReachTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeleportNpcDestinations.run();
