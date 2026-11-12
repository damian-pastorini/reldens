/**
 *
 * Reldens - Test Teleport NPC Arrivals
 *
 * Tests where and how a teleport NPC option leaves the player (exclusive group, the first player next to the town
 * teleport NPC with its dialog open, TeleportNpcSteps, the room messages recorded on the page): the stored forest
 * option (no position) closes the dialog and arrives on the forest default return point with the forest title on the
 * scene label, the same life and stats and the forest room and position stored; a destination with a position and no
 * direction uses the default return point direction; a same room destination with a position stores it, and without
 * a position places the player on the room default return point; an option sent again once the blocked destination
 * room is available relocates the player; the page closed right after the option leaves the next login in the
 * destination room; the open player stats box is closed by the teleport scene change, or stays open with
 * automaticallyCloseAllDialogsOnSceneChange off; and a banned user whose destination join is rejected gets the
 * reconnect modal.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { WorldE2eStateApi } = require('./helpers/world-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { SecurityApi } = require('./helpers/security-api');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeleportNpcArrivals
{

    static BLOCK_MS = 60000;
    static SCENE_LABEL = '.scene-label';
    static CLOSE_DIALOGS_PATH = 'client/rooms/automaticallyCloseAllDialogsOnSceneChange';

    static async enterWithDialog(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let npc = await TeleportNpcSteps.openDialog(context, player.page);
        npc.id = await player.page.evaluate(
            (objectKey) => window.reldens.getActiveScene().objectsAnimations[objectKey].id,
            npc.teleportData.clientKey
        );
        return Object.assign(npc, {player});
    }

    static async fetchArrival(context, roomName)
    {
        let arrived = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, roomName, context.gameConfig.e2ePlayerName);
        return [arrived.x, arrived.y, arrived.dir];
    }

    static async fetchStoredState(context)
    {
        let storedState = await E2eSeedAndRestoreApi.fetchPlayerState(context.gameConfig, context.gameConfig.e2ePlayerName);
        return [Number(storedState.room_id), Number(storedState.x), Number(storedState.y), storedState.dir];
    }

    static async runForestArrivalTest(context)
    {
        let npc = await TestTeleportNpcArrivals.enterWithDialog(context);
        let destinationRoom = npc.teleportData.destinationRoom;
        let before = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.TOWN_ROOM_NAME, npc.player.playerName);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await Navigation.waitForRoom(npc.page, destinationRoom, TimeConstants.ROOM_TRANSITION);
        expect(
            (await RoomMessagesRecorder.fetchMessages(npc.page, GameConst.CLOSE_UI_ACTION)).filter(message => npc.id === message.id),
            'The valid option closes the dialog'
        ).toHaveLength(1);
        let returnPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(context.gameConfig, destinationRoom);
        let returnPointPosition = [returnPoint.x, returnPoint.y, returnPoint.dir];
        expect(await TestTeleportNpcArrivals.fetchArrival(context, destinationRoom), 'The arrival is the default return point')
            .toEqual(returnPointPosition);
        let roomRow = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'rooms', {name: destinationRoom})].shift();
        await expect(npc.page.locator(TestTeleportNpcArrivals.SCENE_LABEL), 'The scene label shows the destination title')
            .toHaveText(roomRow.title);
        let arrived = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, destinationRoom, npc.player.playerName);
        expect([arrived.life, arrived.stats], 'The life and stats are the same as before the teleport')
            .toEqual([before.life, before.stats]);
        expect(await TestTeleportNpcArrivals.fetchStoredState(context), 'The destination room and position are stored')
            .toEqual([Number(roomRow.id), ...returnPointPosition]);
    }

    static async runPositionWithoutDirectionTest(context)
    {
        let npc = await TestTeleportNpcArrivals.enterWithDialog(context);
        let returnPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(context.gameConfig, Login.FOREST_ROOM_NAME);
        let destination = {room: Login.FOREST_ROOM_NAME, x: returnPoint.x + Navigation.TILE_SIZE, y: returnPoint.y};
        await TeleportNpcSteps.chooseOption(npc, await TeleportNpcSteps.addDestination(context, npc, destination));
        await Navigation.waitForRoom(npc.page, Login.FOREST_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        expect(
            await TestTeleportNpcArrivals.fetchArrival(context, Login.FOREST_ROOM_NAME),
            'The position is used with the default return point direction'
        ).toEqual([destination.x, destination.y, returnPoint.dir]);
    }

    static async runSameRoomStoredTest(context, destinationPosition, expectedDirection)
    {
        let npc = await TestTeleportNpcArrivals.enterWithDialog(context);
        let returnPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(context.gameConfig, Login.TOWN_ROOM_NAME);
        let destination = Object.assign({room: Login.TOWN_ROOM_NAME}, destinationPosition(returnPoint));
        await TeleportNpcSteps.chooseOption(npc, await TeleportNpcSteps.addDestination(context, npc, destination));
        let townRoomId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'rooms', {name: Login.TOWN_ROOM_NAME});
        await expect.poll(
            async () => TestTeleportNpcArrivals.fetchStoredState(context),
            {message: 'The same room destination is stored', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([townRoomId, returnPoint.x, returnPoint.y, expectedDirection(returnPoint)]);
        expect(
            await TestTeleportNpcArrivals.fetchArrival(context, Login.TOWN_ROOM_NAME),
            'The player is placed on the same room destination'
        ).toEqual([returnPoint.x, returnPoint.y, expectedDirection(returnPoint)]);
    }

    static async runAvailableAgainTest(context)
    {
        let npc = await TestTeleportNpcArrivals.enterWithDialog(context);
        await WorldE2eStateApi.blockSceneChanges(context.gameConfig, Login.TOWN_ROOM_NAME, TestTeleportNpcArrivals.BLOCK_MS);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await npc.page.waitForTimeout(TimeConstants.ACTION);
        expect(await Navigation.getCurrentRoomName(npc.page), 'The blocked destination keeps the player').toBe(Login.TOWN_ROOM_NAME);
        await WorldE2eStateApi.unblockSceneChanges(context.gameConfig, Login.TOWN_ROOM_NAME);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await Navigation.waitForRoom(npc.page, npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
    }

    static async runClosedPageTest(context)
    {
        let npc = await TestTeleportNpcArrivals.enterWithDialog(context);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await npc.page.goto('about:blank');
        let destinationRoomId = await E2eSeedAndRestoreApi.fetchRowId(
            context.gameConfig,
            'rooms',
            {name: npc.teleportData.destinationRoom}
        );
        await expect.poll(
            async () => (await TestTeleportNpcArrivals.fetchStoredState(context))[0],
            {message: 'The option stores the destination room', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(destinationRoomId);
        await Login.loginRootPlayer(npc.page, context.gameConfig, context.longRun);
        expect(await Navigation.getCurrentRoomName(npc.page), 'The next login starts in the destination room')
            .toBe(npc.teleportData.destinationRoom);
    }

    static async runOpenBoxTest(context, isCloseEnabled)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestTeleportNpcArrivals.CLOSE_DIALOGS_PATH,
            isCloseEnabled
        );
        let npc = await TestTeleportNpcArrivals.enterWithDialog(context);
        await npc.page.click(Selectors.hud.playerStatsOpen);
        let statsBox = npc.page.locator(Selectors.hud.playerStatsUi);
        await expect(statsBox, 'The player stats box is open').toBeVisible();
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await Navigation.waitForRoom(npc.page, npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
        if(isCloseEnabled){
            await expect(statsBox, 'The teleport scene change closes the open boxes').toBeHidden();
            return;
        }
        await expect(statsBox, 'With the dialogs close off the open boxes stay open').toBeVisible();
    }

    static async runRejectedJoinTest(context)
    {
        let npc = await TestTeleportNpcArrivals.enterWithDialog(context);
        await SecurityApi.banUser(context.gameConfig, context.gameConfig.e2eUsername);
        await TeleportNpcSteps.chooseOption(npc, npc.teleportData.optionValue);
        await expect(npc.page.locator(Selectors.reloadModal.message), 'The rejected destination join shows the reconnect modal')
            .toHaveText(GameTranslations.game.errors.reconnectClient, {timeout: TimeConstants.GAME_START});
    }

    static run()
    {
        test.describe('Teleport NPC Arrivals', () => {
            test('the forest option arrives on the default return point with its title, the same stats and the stored state', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runForestArrivalTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a destination position without direction uses the default return point direction', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runPositionWithoutDirectionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a same room destination with a position stores the new position', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runSameRoomStoredTest(
                    {page, gameConfig, e2eGroup, longRun},
                    (returnPoint) => ({x: returnPoint.x, y: returnPoint.y, dir: GameConst.LEFT}),
                    () => GameConst.LEFT
                );
            });
            test('a same room destination without a position places the player on the room default return point', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runSameRoomStoredTest(
                    {page, gameConfig, e2eGroup, longRun},
                    () => ({}),
                    (returnPoint) => returnPoint.dir
                );
            });
            test('an option sent again once the destination room is available relocates the player', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runAvailableAgainTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the page closed right after the option leaves the next login in the destination room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runClosedPageTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the teleport scene change closes the open boxes', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runOpenBoxTest({page, gameConfig, e2eGroup, longRun}, true);
            });
            test('with the dialogs close off the open boxes stay open after the teleport', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runOpenBoxTest({page, gameConfig, e2eGroup, longRun}, false);
            });
            test('a rejected destination join shows the reconnect modal', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcArrivals.runRejectedJoinTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeleportNpcArrivals.run();
