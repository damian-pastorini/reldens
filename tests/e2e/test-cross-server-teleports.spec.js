/**
 *
 * Reldens - Test Cross Server Teleports
 *
 * Tests the teleports of a player to a room of another server (exclusive group, the second house on server-2 and the
 * town on server-1 set by CrossServerHouseAssignment, the e2e destination option added to the live teleport NPC of the
 * town and restored by the group reset): the teleport with a position arrives in the second house on server-2 on that
 * position, the one without a position arrives on the default return point of the house, the town observer removes the
 * player sprite and no client shows the session ended modal.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerTeleports
{

    static POSITION_OFFSET = 64;
    static async runTeleportTest(context, destinationPosition)
    {
        let {page, secondPage, gameConfig} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let townSessionId = await CrossServerHouseAssignment.loginWithTownObserver(context);
        let npc = await TeleportNpcSteps.openDialog(context, page);
        let optionValue = await TeleportNpcSteps.addDestination(
            context,
            npc,
            Object.assign({room: CrossServerHouseAssignment.SECOND_HOUSE}, destinationPosition)
        );
        await TeleportNpcSteps.chooseOption(npc, optionValue);
        await Navigation.waitForRoom(page, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        await SceneSpritesRecorder.waitForRemovedPlayer(secondPage, townSessionId, TimeConstants.SERVER_RESPONSE);
        let arrived = await CrossServerHouseAssignment.fetchHouseArrivalState(page, secondServerConfig, gameConfig.e2ePlayerName);
        let expectedPosition = destinationPosition.x
            ? destinationPosition
            : await TeleportNpcSteps.fetchDefaultReturnPoint(gameConfig, CrossServerHouseAssignment.SECOND_HOUSE);
        expect(
            {isGameOver: arrived.isGameOver, position: [arrived.housePlayer.x, arrived.housePlayer.y]},
            'The teleport sends the player to the house on server-2 with no modal: '+arrived.housePlayer.error
        ).toEqual({isGameOver: false, position: [expectedPosition.x, expectedPosition.y]});
    }

    static async fetchShiftedArrival(gameConfig)
    {
        return [await CrossServerHouseAssignment.fetchHouseArrival(gameConfig)].map(
            arrival => ({x: arrival.x + TestCrossServerTeleports.POSITION_OFFSET, y: arrival.y, dir: arrival.dir})
        ).pop();
    }

    static run()
    {
        test.describe('Cross Server Teleports', () => {
            test('a teleport to a server-2 room with a position arrives there and leaves the server-1 observer', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeleports.runTeleportTest(
                    {page, secondPage, gameConfig, e2eGroup, longRun},
                    await TestCrossServerTeleports.fetchShiftedArrival(gameConfig)
                );
            });
            test('a teleport to a server-2 room without a position arrives on its default return point', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeleports.runTeleportTest({page, secondPage, gameConfig, e2eGroup, longRun}, {});
            });
        });
    }

}

TestCrossServerTeleports.run();
