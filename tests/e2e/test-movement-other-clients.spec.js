/**
 *
 * Reldens - Test Movement Other Clients
 *
 * Tests the sprites a client shows for the other players of its room (exclusive group, the town moving objects paused
 * and the moving player placed on the town return point first; the sprite position read with the player engine left
 * and top offsets added back, so it is compared with the server body position): a player that walked away from its
 * join position before another client logs in is shown by that client on its current server position, added from the
 * players queue the client fills while its engine has not started; a client that logs in while another player walks a
 * long clear line of tiles (no room body crosses it; slowed down for the group until the client sees it moving, so the
 * walk outlasts the login) sees
 * that player moving and stopping on its final server position; a client with an NPC dialog
 * open keeps it open when another player of its room changes scene (only the own scene change closes the dialogs); and a
 * client keeps the sprite of a player crossing a change point still while that player state already holds the next
 * scene and its return point (every state change of that player is recorded with the sprite before and after it).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Phaser } = require('./helpers/phaser');
const { Selectors } = require('./selectors');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementOtherClients
{

    static WALK_DISTANCES = [4, 3, 2];
    static OBSERVER_SUFFIX = '2';
    static LONG_WALK_DISTANCES = [12, 10, 8, 6];
    static NPC_MINIMUM_TILES = 2;
    static SLOW_SPEED = 30;
    static READ_SPRITE_POSITION = (sessionId) => [window.reldens.getCurrentPlayer()].map((playerEngine) => ({
        x: Math.round(playerEngine.players[sessionId].x + playerEngine.leftOff),
        y: Math.round(playerEngine.players[sessionId].y + playerEngine.topOff)
    })).pop();

    static async enterMover(context)
    {
        let mover = (await TeamSteps.enterPlayers(context, 1)).shift();
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            mover.playerName,
            context.longRun
        );
        await MovementScenario.pauseMovingObjects(context.gameConfig, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(mover.page, walkContext);
        return {mover, walkContext};
    }

    static async loginObserver(context, moverSessionId)
    {
        await Login.loginRootPlayer(
            context.secondPage,
            context.gameConfig,
            context.longRun,
            TestMovementOtherClients.OBSERVER_SUFFIX
        );
        await SceneSpritesRecorder.waitForShownPlayer(context.secondPage, moverSessionId, TimeConstants.SERVER_RESPONSE);
    }

    static async changeMoverSpeed(context, scenario, movementSpeed)
    {
        let changed = await GameplayE2eStateApi.changePlayerBody(
            context.gameConfig,
            context.e2eGroup,
            Login.TOWN_ROOM_NAME,
            scenario.mover.playerName,
            {movementSpeed}
        );
        expect(changed.changed, 'The player speed changes: '+changed.error).toEqual(['movementSpeed']);
    }

    static async runMovedBeforeLoginTest(context)
    {
        let scenario = await TestMovementOtherClients.enterMover(context);
        let joined = await scenario.walkContext.fetchPlayer();
        await MovementScenario.walkClearLine(
            scenario.mover.page,
            scenario.walkContext,
            Login.TOWN_ROOM_NAME,
            scenario.mover.playerName,
            TestMovementOtherClients.WALK_DISTANCES
        );
        let moved = await scenario.walkContext.fetchPlayer();
        expect([moved.x, moved.y], 'The player walked away from its join position').not.toEqual([joined.x, joined.y]);
        await TestMovementOtherClients.loginObserver(context, scenario.mover.sessionId);
        expect(
            await context.secondPage.evaluate(TestMovementOtherClients.READ_SPRITE_POSITION, scenario.mover.sessionId),
            'The other client shows the player on its current server position'
        ).toEqual({x: moved.x, y: moved.y});
        expect(
            await context.secondPage.evaluate(
                (sessionId) => sessionId in window.reldens.activeRoomEvents.playersQueue,
                scenario.mover.sessionId
            ),
            'The player was queued until the other client engine started'
        ).toBe(true);
    }

    static async runWalkingDuringLoginTest(context)
    {
        let scenario = await TestMovementOtherClients.enterMover(context);
        let targetTile = await RoomMovementApi.fetchClearLineTile(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            scenario.mover.playerName,
            TestMovementOtherClients.LONG_WALK_DISTANCES
        );
        expect(targetTile, 'A long clear line of tiles starts on the player').toBeTruthy();
        let normalSpeed = (await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            scenario.mover.playerName
        )).movementSpeed;
        await TestMovementOtherClients.changeMoverSpeed(context, scenario, TestMovementOtherClients.SLOW_SPEED);
        await RoomMessagesRecorder.sendMessage(scenario.mover.page, {
            act: GameConst.POINTER,
            column: targetTile[0],
            row: targetTile[1]
        });
        await TestMovementOtherClients.loginObserver(context, scenario.mover.sessionId);
        let firstSeen = await context.secondPage.evaluate(
            TestMovementOtherClients.READ_SPRITE_POSITION,
            scenario.mover.sessionId
        );
        expect((await scenario.walkContext.fetchPlayer()).pathSteps, 'The player still walks its path').toBeGreaterThan(0);
        await expect.poll(
            async () => sc.toJsonString(await context.secondPage.evaluate(
                TestMovementOtherClients.READ_SPRITE_POSITION,
                scenario.mover.sessionId
            )) !== sc.toJsonString(firstSeen),
            {message: 'The other client sees the player moving', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        await TestMovementOtherClients.changeMoverSpeed(context, scenario, normalSpeed);
        let walk = await RoomMovementApi.collectTrail(
            scenario.walkContext.fetchPlayer,
            (player) => scenario.walkContext.isStill(player)
                && targetTile[0] === player.currentCol
                && targetTile[1] === player.currentRow,
            scenario.walkContext.navTimeout
        );
        expect(walk.done, 'The player stops on the path end: '+sc.toJsonString(walk.last)).toBe(true);
        await expect.poll(
            async () => context.secondPage.evaluate(TestMovementOtherClients.READ_SPRITE_POSITION, scenario.mover.sessionId),
            {message: 'The other client shows the player stopped on its server position', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual({x: walk.last.x, y: walk.last.y});
    }

    static async runOtherClientDialogTest(context)
    {
        let gameConfig = context.gameConfig;
        let players = await TeamSteps.enterPlayers(context, 2);
        let observer = players[1];
        let npcKey = gameConfig.e2eNpcKey;
        await MovementScenario.pauseMovingObjects(gameConfig, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerNextToNpc(
            observer.page,
            Object.assign(
                {npcKey},
                MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, observer.playerName, context.longRun)
            ),
            TestMovementOtherClients.NPC_MINIMUM_TILES
        );
        expect(await Phaser.triggerObjectInteraction(observer.page, npcKey), 'The NPC interaction is sent').toBe(true);
        let dialog = observer.page.locator(Selectors.npc.dialogue).filter({visible: true}).first();
        await expect(dialog, 'The other client NPC dialog is open').toBeVisible({timeout: TimeConstants.UI_OPEN});
        await TeamSteps.changeScene(context, players[0], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await SceneSpritesRecorder.waitForRemovedPlayer(observer.page, players[0].sessionId, TimeConstants.SERVER_RESPONSE);
        await expect(dialog, 'The scene change of another player keeps the NPC dialog open').toBeVisible();
    }

    static async runLeavingPlayerSpriteTest(context)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        let observerPage = players[1].page;
        await MovementScenario.pauseMovingObjects(context.gameConfig, Login.TOWN_ROOM_NAME);
        await observerPage.evaluate((leavingSessionId) => {
            let roomEvents = window.reldens.activeRoomEvents;
            let originalOnChange = roomEvents.playersOnChange.bind(roomEvents);
            let readSprite = () => [window.reldens.getCurrentPlayer().players[leavingSessionId]].map(
                (sprite) => sprite ? [Math.round(sprite.x), Math.round(sprite.y)] : false
            ).pop();
            window.e2eLeavingChanges = [];
            roomEvents.playersOnChange = (player, key, from) => {
                let before = readSprite();
                originalOnChange(player, key, from);
                if(leavingSessionId === key){
                    window.e2eLeavingChanges.push({scene: player.state.scene, before, after: readSprite()});
                }
            };
        }, players[0].sessionId);
        await TeamSteps.changeScene(context, players[0], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await SceneSpritesRecorder.waitForRemovedPlayer(observerPage, players[0].sessionId, TimeConstants.SERVER_RESPONSE);
        let nextSceneChanges = (await observerPage.evaluate(() => window.e2eLeavingChanges)).filter(
            (change) => Login.FOREST_ROOM_NAME === change.scene
        );
        expect(nextSceneChanges.length, 'The other client got the leaving player state with the next scene')
            .toBeGreaterThan(0);
        expect(
            nextSceneChanges.filter((change) => sc.toJsonString(change.before) !== sc.toJsonString(change.after)),
            'The sprite stays still while the leaving player state holds the next scene'
        ).toEqual([]);
    }

    static run()
    {
        test.describe('Movement Other Clients', () => {
            test('a player that moved before another client logs in is shown on its current server position', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementOtherClients.runMovedBeforeLoginTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a client logging in while another player walks sees it moving and stopping on its server position', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementOtherClients.runWalkingDuringLoginTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the scene change of another player keeps the NPC dialog of a client open', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementOtherClients.runOtherClientDialogTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a client keeps the sprite of a leaving player still while its state holds the next scene', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMovementOtherClients.runLeavingPlayerSpriteTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementOtherClients.run();
