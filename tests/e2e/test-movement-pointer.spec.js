/**
 *
 * Reldens - Test Movement Pointer
 *
 * Tests the real canvas clicks of the game page (world group, the town moving objects paused, the player placed on the
 * town return point, the camera settled before the click and the movement messages recorded on the server; the
 * sample primaryMove is off, so the secondary button moves, and the joystick controller registered by default sends a
 * stop on every mouse release): a click on a free tile sends one pointer move, walks the player to that tile and shows
 * the pointer arrow, and a primary button click moves nothing; with primaryMove switched on in the client config the
 * secondary button moves nothing and the primary one walks; a touch tap from a page with touch support walks the
 * player and its touch end sends the stop; a second click destroys the arrow of the first one
 * before its animation ends; a click while the chat input has the focus blurs the input and walks the player; a click
 * on an NPC sprite sends no pointer move; a disabled player keys and clicks send only stops and the player walks again
 * once active; and with the client pointer arrow off a click walks with no arrow, with the client tap movement off a
 * click sends no pointer move.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { ChatSteps } = require('./helpers/chat-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementPointer
{

    static WALK_DISTANCES = [4, 3, 2];
    static POINTER_MESSAGE = {dir: '', act: GameConst.POINTER};
    static STOP_MESSAGE = {dir: '', act: GameConst.STOP};
    static CLICK_MESSAGES = [TestMovementPointer.POINTER_MESSAGE, TestMovementPointer.STOP_MESSAGE];
    static QUIET_MS = 1000;
    static CAMERA_POLL_MS = 200;
    static NPC_MINIMUM_TILES = 2;
    static NPC_CLICK_OFFSET = 8;
    static MOVE_BUTTON = 'right';
    static PRIMARY_BUTTON = 'left';

    static async enterAndTarget(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let tile = await RoomMovementApi.fetchClearLineTile(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName,
            TestMovementPointer.WALK_DISTANCES
        );
        expect(tile, 'A clear line of tiles starts on the player').toBeTruthy();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await SceneSpritesRecorder.start(context.page);
        return {walkContext, tile, point: WalkableTileLocator.worldPoint(tile)};
    }

    static async clickTile(context, target, button = TestMovementPointer.MOVE_BUTTON)
    {
        await Navigation.waitForCameraSettled(context.page, TimeConstants.SCENE_LOAD, TestMovementPointer.CAMERA_POLL_MS);
        expect(
            await Navigation.navigateToWorldPoint(context.page, target.point.x, target.point.y, button),
            'The tile '+target.tile.join(',')+' is shown on the canvas'
        ).toBe(true);
    }

    static async clickAndWalk(context, target, button = TestMovementPointer.MOVE_BUTTON)
    {
        await TestMovementPointer.clickTile(context, target, button);
        let walk = await RoomMovementApi.collectTrail(
            target.walkContext.fetchPlayer,
            (player) => target.walkContext.isStill(player)
                && target.tile[0] === player.currentCol
                && target.tile[1] === player.currentRow,
            target.walkContext.navTimeout
        );
        expect(walk.done, 'The click walks the player to the tile: '+sc.toJsonString(walk.last)).toBe(true);
    }

    static async expectMessages(context, walkContext, expectedMessages, message)
    {
        expect(
            await GameplayE2eStateApi.fetchMovementMessages(context.gameConfig, walkContext.playerName),
            message
        ).toEqual(expectedMessages);
    }

    static async runClickWalkTest(context)
    {
        let target = await TestMovementPointer.enterAndTarget(context);
        await TestMovementPointer.clickAndWalk(context, target);
        await TestMovementPointer.expectMessages(
            context,
            target.walkContext,
            TestMovementPointer.CLICK_MESSAGES,
            'The click sends one pointer move and its release the stop'
        );
        expect(
            await SceneSpritesRecorder.fetchSprites(context.page, GameConst.ARROW_DOWN),
            'The click shows the pointer arrow'
        ).toHaveLength(1);
    }

    static async runPrimaryButtonTest(context)
    {
        let target = await TestMovementPointer.enterAndTarget(context);
        let start = await target.walkContext.fetchPlayer();
        await TestMovementPointer.clickTile(context, target, TestMovementPointer.PRIMARY_BUTTON);
        await TestMovementPointer.expectNoPointerMove(
            context,
            target.walkContext,
            start,
            'The primary button sends no pointer move with primaryMove off'
        );
        await TestMovementPointer.clickAndWalk(context, target);
    }

    static async runPrimaryMoveOnTest(context)
    {
        let target = await TestMovementPointer.enterAndTarget(context);
        let start = await target.walkContext.fetchPlayer();
        await context.page.evaluate(() => {
            window.reldens.config.client.ui.controls.primaryMove = true;
        });
        await TestMovementPointer.clickTile(context, target);
        await TestMovementPointer.expectNoPointerMove(
            context,
            target.walkContext,
            start,
            'The secondary button sends no pointer move with primaryMove on'
        );
        await TestMovementPointer.clickAndWalk(context, target, TestMovementPointer.PRIMARY_BUTTON);
    }

    static async runTouchTapTest(context)
    {
        let touchClient = await Login.openClientPage(context.page, context.gameConfig, {hasTouch: true});
        let touchContext = Object.assign({}, context, {page: touchClient.clientPage});
        let target = await TestMovementPointer.enterAndTarget(touchContext);
        await TestMovementPointer.clickAndWalk(touchContext, target, Navigation.TOUCH_BUTTON);
        await TestMovementPointer.expectMessages(
            touchContext,
            target.walkContext,
            TestMovementPointer.CLICK_MESSAGES,
            'The tap sends one pointer move and its touch end the stop'
        );
    }

    static async expectNoPointerMove(context, walkContext, start, message)
    {
        await context.page.waitForTimeout(TestMovementPointer.QUIET_MS);
        await TestMovementPointer.expectMessages(context, walkContext, [TestMovementPointer.STOP_MESSAGE], message);
        let end = await walkContext.fetchPlayer();
        expect([end.currentCol, end.currentRow], 'The player stays on its tile').toEqual([
            start.currentCol,
            start.currentRow
        ]);
    }

    static async runSecondClickTest(context)
    {
        let target = await TestMovementPointer.enterAndTarget(context);
        await TestMovementPointer.clickTile(context, target);
        expect(await context.page.evaluate(() => {
            window.e2eFirstArrow = window.reldens.getActiveScene().arrowSprite;
            return Boolean(window.e2eFirstArrow?.scene);
        }), 'The first arrow is still shown').toBe(true);
        await TestMovementPointer.clickAndWalk(context, target);
        expect(await context.page.evaluate(() => [
            Boolean(window.e2eFirstArrow.scene),
            window.e2eFirstArrow !== window.reldens.getActiveScene().arrowSprite
        ]), 'The second click destroys the first arrow and creates its own').toEqual([false, true]);
        await TestMovementPointer.expectMessages(
            context,
            target.walkContext,
            [...TestMovementPointer.CLICK_MESSAGES, ...TestMovementPointer.CLICK_MESSAGES],
            'Every click sends its pointer move and its release the stop'
        );
    }

    static async runChatFocusClickTest(context)
    {
        let target = await TestMovementPointer.enterAndTarget(context);
        await ChatSteps.openChat(context.page);
        await context.page.locator(Selectors.chat.input).focus();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, target.walkContext.playerName);
        await TestMovementPointer.clickAndWalk(context, target);
        expect(await context.page.evaluate(() => window.reldens.gameDom.insideInput()), 'The click blurs the input')
            .toBe(false);
        await TestMovementPointer.expectMessages(
            context,
            target.walkContext,
            TestMovementPointer.CLICK_MESSAGES,
            'The click with the focused chat input sends its pointer move'
        );
    }

    static async runNpcClickTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        let npcContext = Object.assign({npcKey: context.gameConfig.e2eNpcKey}, walkContext);
        await MovementScenario.placePlayerNextToNpc(context.page, npcContext, TestMovementPointer.NPC_MINIMUM_TILES);
        let start = await walkContext.fetchPlayer();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        expect(
            await Phaser.clickObjectAwayFromOwnPlayer(
                context.page,
                npcContext.npcKey,
                TestMovementPointer.NPC_CLICK_OFFSET,
                false,
                TestMovementPointer.MOVE_BUTTON
            ),
            'The NPC sprite is clicked with the move button'
        ).toBe(true);
        await TestMovementPointer.expectNoPointerMove(
            context,
            walkContext,
            start,
            'The click on the NPC sends no pointer move'
        );
    }

    static async setPlayerState(context, target, inState)
    {
        await GameplayE2eStateApi.setPlayerState(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            target.walkContext.playerName,
            inState
        );
        await context.page.waitForFunction(
            (expectedState) => expectedState === window.reldens.getCurrentPlayer().state.inState,
            inState,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
    }

    static async runDisabledPlayerInputTest(context)
    {
        let target = await TestMovementPointer.enterAndTarget(context);
        let start = await target.walkContext.fetchPlayer();
        await TestMovementPointer.setPlayerState(context, target, GameConst.STATUS.DISABLED);
        await context.page.keyboard.down('ArrowRight');
        await context.page.waitForTimeout(TestMovementPointer.QUIET_MS);
        await context.page.keyboard.up('ArrowRight');
        await TestMovementPointer.clickTile(context, target);
        await context.page.waitForTimeout(TestMovementPointer.QUIET_MS);
        await TestMovementPointer.expectMessages(
            context,
            target.walkContext,
            Array(4).fill(TestMovementPointer.STOP_MESSAGE),
            'The disabled player sends its full stop, the key release, click and mouse release stops, no movement'
        );
        let end = await target.walkContext.fetchPlayer();
        expect([end.currentCol, end.currentRow], 'The disabled player stays on its tile').toEqual([
            start.currentCol,
            start.currentRow
        ]);
        await TestMovementPointer.setPlayerState(context, target, GameConst.STATUS.ACTIVE);
        await TestMovementPointer.clickAndWalk(context, target);
    }

    static async runPointerOptionsTest(context)
    {
        let target = await TestMovementPointer.enterAndTarget(context);
        await context.page.evaluate(() => {
            window.reldens.config.client.ui.pointer.show = false;
        });
        await TestMovementPointer.clickAndWalk(context, target);
        expect(
            await SceneSpritesRecorder.fetchSprites(context.page, GameConst.ARROW_DOWN),
            'The pointer arrow off shows no arrow'
        ).toEqual([]);
        await MovementScenario.placePlayerOnReturnPoint(context.page, target.walkContext);
        let start = await target.walkContext.fetchPlayer();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, target.walkContext.playerName);
        await context.page.evaluate(() => {
            window.reldens.config.client.players.tapMovement.enabled = false;
        });
        await TestMovementPointer.clickTile(context, target);
        await TestMovementPointer.expectNoPointerMove(
            context,
            target.walkContext,
            start,
            'The tap movement off sends no pointer move'
        );
    }

    static run()
    {
        test.describe('Movement Pointer', () => {
            test('a canvas click on a free tile walks the player there and shows the pointer arrow', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runClickWalkTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the primary button click does not move with primaryMove off and the secondary one does', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runPrimaryButtonTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the secondary button click does not move with primaryMove on and the primary one does', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runPrimaryMoveOnTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a touch tap on a free tile walks the player there', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runTouchTapTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a second canvas click destroys the arrow of the first one', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runSecondClickTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a canvas click with the chat input focused blurs it and walks the player', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runChatFocusClickTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a click on an NPC sprite sends no pointer move', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runNpcClickTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a disabled player keys and clicks send only stops and the player moves again once active', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runDisabledPlayerInputTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the client pointer arrow and tap movement options off', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementPointer.runPointerOptionsTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementPointer.run();
