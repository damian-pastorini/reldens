/**
 *
 * Reldens - Test Death Stored State And Timers
 *
 * Tests what a death stores and how its timers run (DeathReviveSteps kills the player in the forest with a real enemy
 * hit): the death stores the life 0 and the death position; the player revived in place and reloaded keeps its full life
 * and its forest position; the player revived in town and reloaded starts in the town on its return point with its full
 * life; a game over time of 0 revives the player with a body that can walk; and without the auto revive the first
 * revive message tells the seconds left rounded up, at least one.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathStoredStateAndTimers
{

    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};
    static WALK_MS = 600;

    static async reloadAndLogin(context, roomName)
    {
        await context.page.reload();
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await Navigation.waitForRoom(
            context.page,
            roomName,
            TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, context.longRun)
        );
        return await DeathReviveSteps.fetchPlayer(context, roomName);
    }

    static async runDeathStoredStateTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(
            context,
            Object.assign({}, TestDeathStoredStateAndTimers.TELEPORT_OFF, DeathReviveSteps.MANUAL_REVIVE_CONFIG),
            0
        );
        let deadPlayer = await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME);
        expect(
            await ForestEnemyKill.fetchStoredLife(context.gameConfig, context.gameConfig.e2ePlayerName),
            'The stored life is 0'
        ).toBe(0);
        let storedState = await E2eSeedAndRestoreApi.fetchPlayerState(
            context.gameConfig,
            context.gameConfig.e2ePlayerName
        );
        expect([Number(storedState.x), Number(storedState.y)], 'The death position is stored').toEqual(
            [Math.trunc(deadPlayer.x), Math.trunc(deadPlayer.y)]
        );
        expect(Number(storedState.room_id)).toBe(
            await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'rooms', {name: Login.FOREST_ROOM_NAME})
        );
    }

    static async runReloadAfterReviveInPlaceTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathStoredStateAndTimers.TELEPORT_OFF, 0);
        let revivedPlayer = await DeathReviveSteps.expectAliveInForest(context);
        let reloadedPlayer = await TestDeathStoredStateAndTimers.reloadAndLogin(context, Login.FOREST_ROOM_NAME);
        expect(reloadedPlayer.life, 'Full life after the reload').toBe(reloadedPlayer.totalLife);
        expect([reloadedPlayer.x, reloadedPlayer.y], 'The same forest position').toEqual(
            [Math.trunc(revivedPlayer.x), Math.trunc(revivedPlayer.y)]
        );
        await context.screenshots.capture(context.page, 'reloaded-after-revive-in-place');
    }

    static async runReloadAfterTownReviveTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, {}, 0);
        let townRoom = (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom;
        await DeathReviveSteps.expectRevivedInTown(context, townRoom.name);
        let reloadedPlayer = await TestDeathStoredStateAndTimers.reloadAndLogin(context, townRoom.name);
        let returnPoint = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'roomsReturnPoints', {
            room_id: townRoom.id,
            is_default: 1
        })].shift();
        expect(reloadedPlayer.life, 'Full life after the reload').toBe(reloadedPlayer.totalLife);
        expect([reloadedPlayer.x, reloadedPlayer.y], 'On the town return point').toEqual(
            [Number(returnPoint.x), Number(returnPoint.y)]
        );
        await context.screenshots.capture(context.page, 'reloaded-after-town-revive');
    }

    static async runZeroGameOverTimeTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, Object.assign(
            {[ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: 0},
            TestDeathStoredStateAndTimers.TELEPORT_OFF
        ), 0);
        let revivedPlayer = await DeathReviveSteps.expectAliveInForest(context);
        await Navigation.walkInDirection(context.page, 'ArrowDown', TestDeathStoredStateAndTimers.WALK_MS);
        let walkedPlayer = await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME);
        expect([walkedPlayer.x, walkedPlayer.y], 'The revived body walks').not.toEqual(
            [revivedPlayer.x, revivedPlayer.y]
        );
    }

    static async expectFirstReviveWait(context, gameOverTimeOut, expectedSeconds)
    {
        await DeathReviveSteps.prepareDeath(context, Object.assign(
            {[ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: gameOverTimeOut},
            TestDeathStoredStateAndTimers.TELEPORT_OFF,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        ));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await RoomMessagesRecorder.start(context.page);
        await DeathReviveSteps.killPlayerInForest(context, {}, 'The player died');
        let reviveMessages = await RoomMessagesRecorder.fetchMessages(
            context.page,
            ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE
        );
        expect(reviveMessages[0]?.reviveWaitSeconds, 'The first revive message seconds').toBe(expectedSeconds);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectAliveInForest(context);
    }

    static run()
    {
        test.describe('Death Stored State And Timers', () => {
            test('death stores the life 0 and the death position', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathStoredStateAndTimers.runDeathStoredStateTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player revived in place keeps its full life and position after a reload', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathStoredStateAndTimers.runReloadAfterReviveInPlaceTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('player revived in town starts on the town return point with full life after a reload', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathStoredStateAndTimers.runReloadAfterTownReviveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('game over time 0 revives the player with a body that walks', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathStoredStateAndTimers.runZeroGameOverTimeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('revive wait seconds are rounded up', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathStoredStateAndTimers.expectFirstReviveWait(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    1500,
                    2
                );
            });
            test('revive wait seconds are at least one', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathStoredStateAndTimers.expectFirstReviveWait(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    500,
                    1
                );
            });
        });
    }

}

TestDeathStoredStateAndTimers.run();
