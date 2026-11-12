/**
 *
 * Reldens - Test Movement Scene Changes
 *
 * Tests the scene changes seen by the moving player and by the other clients (exclusive group, the players log in the
 * town and are placed on the change point to the forest): a change point to a busy room (the town scene changes blocked
 * by the e2e probe) gets the translated busy chat line, keeps the player in the town able to walk, and its retry once
 * the block ends changes the room; the other client in the town gets the scene change broadcast, keeps its own scene
 * visible, removes the sprite of the player that left and clears its target on it; the client already in the forest
 * shows the arriving player with its name, avatar and direction; the room and position stored by the change point
 * are loaded on the next login; and a player logging out with a direction held leaves no movement interval in the room
 * (a closed page keeps it running, ISSUE #333).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ChatSteps } = require('./helpers/chat-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { WorldE2eStateApi } = require('./helpers/world-e2e-state-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ChatConst } = require('../../lib/chat/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementSceneChanges
{

    static BLOCK_MS = 60000;
    static SETTLE_MS = 1500;
    static WALKED_DISTANCE = 32;
    static READ_SPRITE = (sessionId) => [window.reldens.getActiveScene().player.players[sessionId]].map((sprite) => ({
        playerName: sprite.playerName,
        avatarKey: sprite.avatarKey,
        animationKey: sprite.anims.currentAnim.key,
        visible: sprite.visible,
        nameVisible: Boolean(sprite.nameSprite?.visible)
    })).pop();

    static async runBusyRoomRetryTest(context)
    {
        let gameConfig = context.gameConfig;
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let walkContext = MovementScenario.createWalkContext(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            player.playerName,
            context.longRun
        );
        await WorldE2eStateApi.blockSceneChanges(gameConfig, Login.TOWN_ROOM_NAME, TestMovementSceneChanges.BLOCK_MS);
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(
            player.page,
            gameConfig,
            Login.TOWN_ROOM_NAME,
            Login.FOREST_ROOM_NAME
        );
        expect(placed.position, 'The player is placed on the change point to the forest: '+placed.error).toBeTruthy();
        await expect.poll(
            async () => (await ChatSteps.fetchChat(player.page)).filter(
                message => GameConst.ROOM_UNAVAILABLE.SERVER_BUSY === message[ChatConst.MESSAGE.KEY]
                    && ChatConst.TYPES.ERROR === message[ChatConst.TYPES.KEY]
            ).length,
            {message: 'The player gets the busy room line', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        await ChatSteps.openChat(player.page);
        await expect(player.page.locator(Selectors.chat.tabContentGeneral), 'The translated busy line is shown')
            .toContainText(GameTranslations.game.errors.roomServerBusy);
        expect(
            [(await walkContext.fetchPlayer()).isChangingScene, await Navigation.getCurrentRoomName(player.page)],
            'The player stays in the town and is not changing scene'
        ).toEqual([false, Login.TOWN_ROOM_NAME]);
        let startPlacement = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/movement/player-start', {
            roomName: Login.TOWN_ROOM_NAME,
            playerName: player.playerName,
            sessionId: player.sessionId
        });
        expect(startPlacement.position, 'The player is moved off the change point body').toBeTruthy();
        await RoomMessagesRecorder.sendMessage(player.page, {dir: GameConst.DOWN});
        await expect.poll(
            async () => (await walkContext.fetchPlayer()).y - startPlacement.position.y,
            {message: 'The player keeps walking after the rejected scene change', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(TestMovementSceneChanges.WALKED_DISTANCE);
        await RoomMessagesRecorder.sendMessage(player.page, {act: GameConst.STOP});
        await WorldE2eStateApi.unblockSceneChanges(gameConfig, Login.TOWN_ROOM_NAME);
        await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        expect(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, player.playerName)).scene,
            'The retry changes the room'
        ).toBe(Login.FOREST_ROOM_NAME);
    }

    static async runOriginRoomObserverTest(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let mover = players[0];
        let observer = players[1];
        await SceneSpritesRecorder.waitForShownPlayer(observer.page, mover.sessionId, TimeConstants.SERVER_RESPONSE);
        await observer.page.evaluate((moverSessionId) => {
            window.reldens.getActiveScene().player.currentTarget = {id: moverSessionId, type: 'player'};
        }, mover.sessionId);
        await TeamSteps.changeScene(context, mover, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await expect.poll(
            async () => (await RoomMessagesRecorder.fetchMessages(observer.page, GameConst.CHANGING_SCENE)).map(
                message => message.id
            ),
            {message: 'The other client gets the scene change broadcast', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([mover.sessionId]);
        await SceneSpritesRecorder.waitForRemovedPlayer(observer.page, mover.sessionId, TimeConstants.SERVER_RESPONSE);
        await observer.page.waitForTimeout(TestMovementSceneChanges.SETTLE_MS);
        expect(await observer.page.evaluate((moverSessionId) => [window.reldens.getActiveScene()].map((scene) => ({
            sceneKey: scene.sys.settings.key,
            visible: scene.sys.settings.visible,
            isChangingScene: window.reldens.isChangingScene,
            target: scene.player.currentTarget,
            moverSprite: Boolean(scene.player.players[moverSessionId])
        })).pop(), mover.sessionId), 'The other client keeps its scene, without the sprite and the target of the player').toEqual({
            sceneKey: Login.TOWN_ROOM_NAME,
            visible: true,
            isChangingScene: false,
            target: false,
            moverSprite: false
        });
    }

    static async runDestinationRoomObserverTest(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let mover = players[0];
        let observer = players[1];
        await TeamSteps.changeScene(context, observer, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.changeScene(context, mover, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        let moverSessionId = await mover.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await SceneSpritesRecorder.waitForShownPlayer(observer.page, moverSessionId, TimeConstants.SERVER_RESPONSE);
        let moverState = await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            mover.playerName
        );
        let ownSprite = await mover.page.evaluate(TestMovementSceneChanges.READ_SPRITE, moverSessionId);
        expect(ownSprite.animationKey.endsWith('_'+moverState.dir), 'The own sprite faces the arrival direction')
            .toBe(true);
        expect(
            await observer.page.evaluate(TestMovementSceneChanges.READ_SPRITE, moverSessionId),
            'The other client shows the arriving player with its name, avatar and direction'
        ).toEqual(Object.assign({}, ownSprite, {playerName: mover.playerName, visible: true, nameVisible: true}));
    }

    static async runChangePointReloginTest(context)
    {
        let gameConfig = context.gameConfig;
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await player.page.locator(Selectors.hud.logout).waitFor({state: 'visible', timeout: TimeConstants.SCENE_LOAD});
        await player.page.click(Selectors.hud.logout);
        await expect(player.page.locator(Selectors.login.form), 'The logout returns to the login').toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, context.longRun)
        });
        let storedState = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'playersState', {
            player_id: player.playerId
        })).shift();
        expect(storedState.room_id, 'The change point stored the forest room').toBe(
            await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: Login.FOREST_ROOM_NAME})
        );
        await Login.loginRootPlayer(player.page, gameConfig, context.longRun);
        let reloggedPlayer = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, player.playerName);
        expect(
            [await Navigation.getCurrentRoomName(player.page), reloggedPlayer.x, reloggedPlayer.y],
            'The next login loads the forest on the stored position'
        ).toEqual([Login.FOREST_ROOM_NAME, storedState.x, storedState.y]);
    }

    static async runSecondVisitTest(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let preloaderName = GameConst.SCENE_PRELOADER+Login.FOREST_ROOM_NAME;
        await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.changeScene(context, player, Login.FOREST_ROOM_NAME, Login.TOWN_ROOM_NAME);
        await player.page.evaluate(() => {
            window.e2eRecurringPreloaders = [];
            window.reldens.events.on('reldens.createdPreloaderRecurring', (roomEvents, scenePreloader) => {
                window.e2eRecurringPreloaders.push(scenePreloader.sys.settings.key);
            });
        });
        await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        expect(await player.page.evaluate((forestPreloaderName) => [
            window.e2eRecurringPreloaders,
            window.reldens.gameEngine.scene.getScenes(false).filter(
                (scene) => forestPreloaderName === scene.sys.settings.key
            ).length
        ], preloaderName), 'The second visit reuses the only preloader scene of the room').toEqual([[preloaderName], 1]);
    }

    static async runLeaveWhileWalkingTest(context)
    {
        let gameConfig = context.gameConfig;
        let players = await TeamSteps.enterPlayers(context, 2);
        let walker = players[0];
        await RoomMessagesRecorder.sendMessage(walker.page, {dir: GameConst.RIGHT});
        await expect.poll(
            async () => await GameplayE2eStateApi.fetchMovementIntervals(gameConfig, Login.TOWN_ROOM_NAME, walker.playerId),
            {message: 'The held direction runs its movement interval', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([walker.playerId+'_'+GameConst.RIGHT]);
        await walker.page.click(Selectors.hud.logout);
        await expect.poll(
            async () => Boolean(
                (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, walker.playerName)).error
            ),
            {message: 'The walker leaves the town', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        expect(
            await GameplayE2eStateApi.fetchMovementIntervals(gameConfig, Login.TOWN_ROOM_NAME, walker.playerId),
            'The leave clears the movement intervals of the walker'
        ).toEqual([]);
    }

    static run()
    {
        test.describe('Movement Scene Changes', () => {
            test('a change point to a busy room keeps the player walking and its retry changes the room', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementSceneChanges.runBusyRoomRetryTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the other client in the origin room keeps its scene and removes the sprite and the target of the player', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementSceneChanges.runOriginRoomObserverTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the client in the destination room shows the arriving player with its name, avatar and direction', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementSceneChanges.runDestinationRoomObserverTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the room and position stored by a change point are loaded on the next login', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementSceneChanges.runChangePointReloginTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a second visit to a room reuses its preloader scene', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementSceneChanges.runSecondVisitTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a player logging out with a direction held leaves no movement interval in the room', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementSceneChanges.runLeaveWhileWalkingTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementSceneChanges.run();
