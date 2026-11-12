/**
 *
 * Reldens - Test Teleport NPC Relocations
 *
 * Tests the relocation a teleport NPC option starts (exclusive group, the first player next to the town teleport NPC
 * with its dialog open, TeleportNpcSteps; the room messages and chat lines recorded on every group page): a disabled
 * player gets the dialog closed and stays; a destination room not available (WorldE2eStateApi.blockSceneChanges) sends
 * the busy room line and the player stays and keeps walking (from the town return point, away from the NPC); a failed state save keeps the player in the room and
 * never sends the scene change; two option messages sent at once run a single scene change; an option chosen while
 * walking with a direction held clears the movement interval; another player in the town gets the scene change
 * broadcast, keeps its scene and removes the sprite of the teleported player; another player already in the
 * destination room shows the teleported player arriving; two players with the dialog open keep their own dialog and
 * relocate each one by its own choice; a direction and a skill sent while the body is changing the scene (the flag set
 * on the live body) are ignored, and the same skill runs once the flag is off; and the destination room is stored, so
 * the next login starts there.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { WorldE2eStateApi } = require('./helpers/world-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { SecurityApi } = require('./helpers/security-api');
const { ChatSteps } = require('./helpers/chat-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { Selectors } = require('./selectors');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeleportNpcRelocations
{

    static BLOCK_MS = 60000;
    static WALKED_DISTANCE = 32;
    static HEAL = 'heal';
    static QUIET_MS = 1500;

    static async enterWithDialog(context, playersCount)
    {
        let players = await TeamSteps.enterPlayers(context, playersCount);
        let npc = await TeleportNpcSteps.openDialog(context, players[0].page);
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            players[0].playerName,
            context.longRun
        );
        return {players, npc, walkContext};
    }

    static async expectInTown(context, entered, message)
    {
        await context.page.waitForTimeout(TimeConstants.ACTION);
        expect(
            [
                await Navigation.getCurrentRoomName(entered.npc.page),
                (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.TOWN_ROOM_NAME, entered.players[0].playerName)).scene,
                (await entered.walkContext.fetchPlayer()).isChangingScene
            ],
            message
        ).toEqual([Login.TOWN_ROOM_NAME, Login.TOWN_ROOM_NAME, false]);
    }

    static async runDisabledPlayerTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 1);
        await GameplayE2eStateApi.setPlayerState(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            entered.players[0].playerName,
            GameConst.STATUS.DISABLED
        );
        await TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue);
        await expect(entered.npc.dialog, 'The disabled player gets the dialog closed').toHaveCount(0, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
        await TestTeleportNpcRelocations.expectInTown(context, entered, 'The disabled player is not relocated');
    }

    static async runUnavailableRoomTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 1);
        await WorldE2eStateApi.blockSceneChanges(context.gameConfig, Login.TOWN_ROOM_NAME, TestTeleportNpcRelocations.BLOCK_MS);
        await TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue);
        await expect.poll(
            async () => (await ChatSteps.fetchChat(entered.npc.page)).filter(
                message => GameConst.ROOM_UNAVAILABLE.SERVER_BUSY === message[ChatConst.MESSAGE.KEY]
                    && ChatConst.TYPES.ERROR === message[ChatConst.TYPES.KEY]
            ).length,
            {message: 'The player gets the busy room line', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        await TestTeleportNpcRelocations.expectInTown(context, entered, 'The player stays in the town');
        await MovementScenario.placePlayerOnReturnPoint(entered.npc.page, entered.walkContext);
        let start = await entered.walkContext.fetchPlayer();
        await RoomMessagesRecorder.sendMessage(entered.npc.page, {dir: GameConst.DOWN});
        await expect.poll(
            async () => (await entered.walkContext.fetchPlayer()).y - start.y,
            {message: 'The player keeps walking after the rejected relocation', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(TestTeleportNpcRelocations.WALKED_DISTANCE);
        await RoomMessagesRecorder.sendMessage(entered.npc.page, {act: GameConst.STOP});
        await WorldE2eStateApi.unblockSceneChanges(context.gameConfig, Login.TOWN_ROOM_NAME);
    }

    static async runFailedSaveTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 1);
        await SecurityApi.request(context.gameConfig, 'POST', '/api/e2e/login-server/break-player-state-save', {
            roomName: Login.TOWN_ROOM_NAME,
            playerName: entered.players[0].playerName
        });
        await TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue);
        await TestTeleportNpcRelocations.expectInTown(context, entered, 'The failed state save keeps the player in the town');
        expect(
            await RoomMessagesRecorder.fetchMessages(entered.npc.page, GameConst.CHANGING_SCENE),
            'The failed state save never sends the scene change'
        ).toEqual([]);
    }

    static async runDoubleOptionTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 2);
        let observerPage = entered.players[1].page;
        await Promise.all([
            TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue),
            TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue)
        ]);
        await Navigation.waitForRoom(entered.npc.page, entered.npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
        await SceneSpritesRecorder.waitForRemovedPlayer(observerPage, entered.players[0].sessionId, TimeConstants.SERVER_RESPONSE);
        expect(
            (await RoomMessagesRecorder.fetchMessages(observerPage, GameConst.CHANGING_SCENE)).map(message => message.id),
            'The two option messages run a single scene change'
        ).toEqual([entered.players[0].sessionId]);
        expect(
            await Navigation.getCurrentRoomName(observerPage),
            'The other player of the town keeps its scene'
        ).toBe(Login.TOWN_ROOM_NAME);
    }

    static async runWalkingOptionTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 1);
        let playerId = entered.players[0].playerId;
        let returnPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(context.gameConfig, Login.TOWN_ROOM_NAME);
        let optionValue = await TeleportNpcSteps.addDestination(context, entered.npc, {
            room: Login.TOWN_ROOM_NAME,
            x: returnPoint.x,
            y: returnPoint.y
        });
        await RoomMessagesRecorder.sendMessage(entered.npc.page, {dir: GameConst.DOWN});
        await expect.poll(
            async () => GameplayE2eStateApi.fetchMovementIntervals(context.gameConfig, Login.TOWN_ROOM_NAME, playerId),
            {message: 'The player walks down', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([playerId+'_'+GameConst.DOWN]);
        await TeleportNpcSteps.chooseOption(entered.npc, optionValue);
        await expect.poll(
            async () => [
                await GameplayE2eStateApi.fetchMovementIntervals(context.gameConfig, Login.TOWN_ROOM_NAME, playerId),
                (await entered.walkContext.fetchPlayer()).pathSteps
            ],
            {message: 'The relocation clears the movement interval and the path', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([[], 0]);
    }

    static async runDestinationObserverTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 2);
        let observer = entered.players[1];
        await TeamSteps.changeScene(context, observer, Login.TOWN_ROOM_NAME, entered.npc.teleportData.destinationRoom);
        await MovementScenario.waitForReadyScene(observer.page);
        await TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue);
        await Navigation.waitForRoom(entered.npc.page, entered.npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
        await SceneSpritesRecorder.waitForShownPlayer(
            observer.page,
            await entered.npc.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId),
            TimeConstants.SERVER_RESPONSE
        );
    }

    static async runTwoDialogsTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 2);
        let secondNpc = await TeleportNpcSteps.openDialog(context, entered.players[1].page);
        await TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue);
        await Navigation.waitForRoom(entered.npc.page, entered.npc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
        await expect(
            secondNpc.dialog.locator('[data-option-value="'+secondNpc.teleportData.optionValue+'"]'),
            'The dialog of the other player keeps its options'
        ).toBeVisible();
        await TeleportNpcSteps.chooseOption(secondNpc, secondNpc.teleportData.optionValue);
        await Navigation.waitForRoom(secondNpc.page, secondNpc.teleportData.destinationRoom, TimeConstants.ROOM_TRANSITION);
        for(let player of entered.players){
            expect(
                (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, entered.npc.teleportData.destinationRoom, player.playerName)).scene,
                'Every player is relocated by its own choice'
            ).toBe(entered.npc.teleportData.destinationRoom);
        }
    }

    static async runChangingSceneInputTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 1);
        let player = entered.players[0];
        let gameConfig = context.gameConfig;
        let changeScene = async (isChangingScene) => GameplayE2eStateApi.changePlayerBody(
            gameConfig,
            context.e2eGroup,
            Login.TOWN_ROOM_NAME,
            player.playerName,
            {isChangingScene}
        );
        expect((await changeScene(true)).changed, 'The player body is changing the scene').toEqual(['isChangingScene']);
        await GameplayE2eStateApi.recordPlayerSkills(gameConfig, Login.TOWN_ROOM_NAME, player.playerName);
        await CombatSkillCasting.targetSelf(player.page);
        await player.page.click(Selectors.combat.skillButton(TestTeleportNpcRelocations.HEAL), {force: true});
        await RoomMessagesRecorder.sendMessage(player.page, {dir: GameConst.DOWN});
        await player.page.waitForTimeout(TestTeleportNpcRelocations.QUIET_MS);
        expect(
            [
                await GameplayE2eStateApi.fetchMovementIntervals(gameConfig, Login.TOWN_ROOM_NAME, player.playerId),
                (await GameplayE2eStateApi.fetchRecordedSkills(gameConfig, player.playerName)).endStates
            ],
            'The movement and the skill sent while changing the scene are ignored'
        ).toEqual([[], []]);
        await changeScene(false);
        await player.page.click(Selectors.combat.skillButton(TestTeleportNpcRelocations.HEAL), {force: true});
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchRecordedSkills(gameConfig, player.playerName)).endStates.length,
            {message: 'The same skill runs once the scene change flag is off', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
    }

    static async runReloginTest(context)
    {
        let entered = await TestTeleportNpcRelocations.enterWithDialog(context, 1);
        let destinationRoom = entered.npc.teleportData.destinationRoom;
        await TeleportNpcSteps.chooseOption(entered.npc, entered.npc.teleportData.optionValue);
        await Navigation.waitForRoom(entered.npc.page, destinationRoom, TimeConstants.ROOM_TRANSITION);
        await entered.npc.page.goto('about:blank');
        await expect.poll(
            async () => Boolean((await GameplayE2eStateApi.fetchPlayer(
                context.gameConfig,
                destinationRoom,
                entered.players[0].playerName
            )).error),
            {message: 'The player left the destination room', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        await Login.loginRootPlayer(entered.npc.page, context.gameConfig, context.longRun);
        expect(
            await Navigation.getCurrentRoomName(entered.npc.page),
            'The next login starts in the stored destination room'
        ).toBe(destinationRoom);
    }

    static run()
    {
        test.describe('Teleport NPC Relocations', () => {
            test('a disabled player choosing a destination gets the dialog closed and stays', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runDisabledPlayerTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a destination room not available sends the busy line and the player stays and walks', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runUnavailableRoomTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a failed state save keeps the player in the room without a scene change', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runFailedSaveTest({page, gameConfig, e2eGroup, longRun});
            });
            test('two option messages at once run a single scene change seen by the town', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runDoubleOptionTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('an option chosen while walking clears the movement interval', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runWalkingOptionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a player in the destination room shows the teleported player arriving', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runDestinationObserverTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('two players with the dialog open relocate each one by its own choice', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runTwoDialogsTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the movement and the skills sent while changing the scene are ignored', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runChangingSceneInputTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the destination room is stored and the next login starts there', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcRelocations.runReloginTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeleportNpcRelocations.run();
