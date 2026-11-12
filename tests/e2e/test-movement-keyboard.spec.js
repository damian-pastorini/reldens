/**
 *
 * Reldens - Test Movement Keyboard
 *
 * Tests the movement keys of the game page (world group, the town moving objects paused and the player placed on the
 * town return point before every key, the movement messages recorded on the server): every arrow and WASD key held
 * moves the player on its axis and sign with a single direction message, and its release sends the stop that stands it
 * still; the arrow keys typed in the focused chat input send no direction and move nobody (their release still sends
 * the stop), and once the input loses the focus the arrows move the player again; the arrows typed in the focused
 * quantity input of the trader buy tab move nobody the same way; the keys held while the scene
 * transition or the scene change flag is on send no direction; an NPC dialog open with no input focused keeps the
 * arrows working; and releasing one of two held keys stops every direction while the key still held is sent again.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { MovementScenario } = require('./helpers/movement-scenario');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { ChatSteps } = require('./helpers/chat-steps');
const { Phaser } = require('./helpers/phaser');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementKeyboard
{

    static KEYS = [
        {key: 'ArrowRight', dir: GameConst.RIGHT, axis: 'x', sign: 1},
        {key: 'KeyD', dir: GameConst.RIGHT, axis: 'x', sign: 1},
        {key: 'ArrowLeft', dir: GameConst.LEFT, axis: 'x', sign: -1},
        {key: 'KeyA', dir: GameConst.LEFT, axis: 'x', sign: -1},
        {key: 'ArrowDown', dir: GameConst.DOWN, axis: 'y', sign: 1},
        {key: 'KeyS', dir: GameConst.DOWN, axis: 'y', sign: 1},
        {key: 'ArrowUp', dir: GameConst.UP, axis: 'y', sign: -1},
        {key: 'KeyW', dir: GameConst.UP, axis: 'y', sign: -1}
    ];
    static HOLD_MS = 600;
    static STOP_MESSAGE = {dir: '', act: GameConst.STOP};
    static BLOCKING_FLAGS = ['transition', 'isChangingScene'];
    static NPC_MINIMUM_TILES = 2;
    static TRADER_BUY = 'buy';

    static async holdKeyAndRelease(context, walkContext, keyCase)
    {
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let start = await walkContext.fetchPlayer();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down(keyCase.key);
        await expect.poll(
            async () => Math.sign((await walkContext.fetchPlayer())[keyCase.axis] - start[keyCase.axis]),
            {message: 'The held '+keyCase.key+' moves on its axis and sign', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(keyCase.sign);
        await context.page.waitForTimeout(TestMovementKeyboard.HOLD_MS);
        await TestMovementKeyboard.releaseAndExpectMessages(
            context,
            walkContext,
            keyCase.key,
            [{dir: keyCase.dir, act: ''}, TestMovementKeyboard.STOP_MESSAGE],
            'The held '+keyCase.key+' sends its direction once and its release sends the stop'
        );
    }

    static async releaseAndExpectMessages(context, walkContext, key, expectedMessages, message)
    {
        await context.page.keyboard.up(key);
        await MovementScenario.expectStillWithMessages(walkContext, expectedMessages, message);
    }

    static async runKeysTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        for(let keyCase of TestMovementKeyboard.KEYS){
            await TestMovementKeyboard.holdKeyAndRelease(context, walkContext, keyCase);
        }
    }

    static async expectInputArrowsMoveNobody(context, walkContext, input, message)
    {
        let start = await walkContext.fetchPlayer();
        await input.focus();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowRight');
        await context.page.waitForTimeout(TestMovementKeyboard.HOLD_MS);
        await context.page.keyboard.up('ArrowRight');
        await expect.poll(
            async () => GameplayE2eStateApi.fetchMovementMessages(context.gameConfig, walkContext.playerName),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([TestMovementKeyboard.STOP_MESSAGE]);
        let end = await walkContext.fetchPlayer();
        expect([end.x, end.y], 'Nobody moves while the input has the focus').toEqual([start.x, start.y]);
        await input.blur();
    }

    static async runChatInputTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        await ChatSteps.openChat(context.page);
        await TestMovementKeyboard.expectInputArrowsMoveNobody(
            context,
            walkContext,
            context.page.locator(Selectors.chat.input),
            'The arrow typed in the chat input sends no direction, only the release stop'
        );
        await TestMovementKeyboard.holdKeyAndRelease(context, walkContext, TestMovementKeyboard.KEYS[0]);
    }

    static async runTraderQuantityInputTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        let traderKey = context.gameConfig.e2eTraderKey;
        await MovementScenario.placePlayerNextToNpc(
            context.page,
            Object.assign({npcKey: traderKey}, walkContext),
            TestMovementKeyboard.NPC_MINIMUM_TILES
        );
        expect(await Phaser.triggerObjectInteraction(context.page, traderKey), 'The trader interaction is sent').toBe(true);
        await RoomMessagesRecorder.sendObjectMessage(
            context.page,
            traderKey,
            {act: ObjectsConst.OBJECT_INTERACTION, value: TestMovementKeyboard.TRADER_BUY}
        );
        let quantityInput = context.page.locator(Selectors.trader.buyTab+' input[type="number"]').first();
        await expect(quantityInput, 'The trader buy tab shows a quantity input').toBeVisible({
            timeout: TimeConstants.UI_OPEN
        });
        await TestMovementKeyboard.expectInputArrowsMoveNobody(
            context,
            walkContext,
            quantityInput,
            'The arrow typed in the trader quantity input sends no direction, only the release stop'
        );
        await TestMovementKeyboard.holdKeyAndRelease(context, walkContext, TestMovementKeyboard.KEYS[0]);
    }

    static async runSceneTransitionKeysTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        for(let blockingFlag of TestMovementKeyboard.BLOCKING_FLAGS){
            await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
            let start = await walkContext.fetchPlayer();
            await context.page.evaluate((flag) => {
                window.reldens.setChangingScene('isChangingScene' === flag);
                window.reldens.getActiveScene().transition = 'transition' === flag;
            }, blockingFlag);
            await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
            await context.page.keyboard.down('ArrowRight');
            await context.page.waitForTimeout(TestMovementKeyboard.HOLD_MS);
            await TestMovementKeyboard.releaseAndExpectMessages(
                context,
                walkContext,
                'ArrowRight',
                [TestMovementKeyboard.STOP_MESSAGE],
                'The key held while '+blockingFlag+' is on sends no direction, only the release stop'
            );
            let end = await walkContext.fetchPlayer();
            expect([end.x, end.y], 'Nobody moves while '+blockingFlag+' is on').toEqual([start.x, start.y]);
            await context.page.evaluate(() => {
                window.reldens.setChangingScene(false);
                window.reldens.getActiveScene().transition = false;
            });
            await TestMovementKeyboard.holdKeyAndRelease(context, walkContext, TestMovementKeyboard.KEYS[0]);
        }
    }

    static async runNpcDialogKeysTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        let npcKey = context.gameConfig.e2eNpcKey;
        await MovementScenario.placePlayerNextToNpc(
            context.page,
            Object.assign({npcKey}, walkContext),
            TestMovementKeyboard.NPC_MINIMUM_TILES
        );
        expect(await Phaser.triggerObjectInteraction(context.page, npcKey), 'The NPC interaction is sent').toBe(true);
        await expect(
            context.page.locator(Selectors.npc.dialogue).filter({visible: true}).first(),
            'The NPC dialog is open'
        ).toBeVisible({timeout: TimeConstants.UI_OPEN});
        expect(await context.page.evaluate(() => window.reldens.gameDom.insideInput()), 'No input has the focus')
            .toBe(false);
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowDown');
        await context.page.waitForTimeout(TestMovementKeyboard.HOLD_MS);
        await TestMovementKeyboard.releaseAndExpectMessages(
            context,
            walkContext,
            'ArrowDown',
            [{dir: GameConst.DOWN, act: ''}, TestMovementKeyboard.STOP_MESSAGE],
            'The arrow key still sends its direction with the NPC dialog open'
        );
    }

    static async runReleasedOneOfTwoKeysTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let movementSpeed = (await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            walkContext.playerName
        )).movementSpeed;
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowRight');
        await context.page.keyboard.down('ArrowDown');
        await context.page.waitForTimeout(TestMovementKeyboard.HOLD_MS);
        await context.page.keyboard.up('ArrowDown');
        await expect.poll(
            async () => [await walkContext.fetchPlayer()].map((player) => [player.velocityX, player.velocityY]).pop(),
            {message: 'The key still held moves the player alone', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([movementSpeed, 0]);
        await TestMovementKeyboard.releaseAndExpectMessages(
            context,
            walkContext,
            'ArrowRight',
            [
                {dir: GameConst.RIGHT, act: ''},
                {dir: GameConst.DOWN, act: ''},
                TestMovementKeyboard.STOP_MESSAGE,
                {dir: GameConst.RIGHT, act: ''},
                TestMovementKeyboard.STOP_MESSAGE
            ],
            'The released key stops every direction and the key still held sends its direction again'
        );
    }

    static run()
    {
        test.describe('Movement Keyboard', () => {
            test('every arrow and WASD key held moves the player once and its release stops it', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementKeyboard.runKeysTest({page, gameConfig, e2eGroup, longRun});
            });
            test('arrows typed in the chat input move nobody and move the player again once it loses the focus', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementKeyboard.runChatInputTest({page, gameConfig, e2eGroup, longRun});
            });
            test('movement keys held during the scene transition or the scene change are ignored', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementKeyboard.runSceneTransitionKeysTest({page, gameConfig, e2eGroup, longRun});
            });
            test('arrows typed in the trader quantity input move nobody', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementKeyboard.runTraderQuantityInputTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the arrow keys still move the player with an NPC dialog open and no input focused', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementKeyboard.runNpcDialogKeysTest({page, gameConfig, e2eGroup, longRun});
            });
            test('releasing one of two held keys stops every direction and the key still held moves the player again', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementKeyboard.runReleasedOneOfTwoKeysTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementKeyboard.run();
