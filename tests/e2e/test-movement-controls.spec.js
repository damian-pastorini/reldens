/**
 *
 * Reldens - Test Movement Controls
 *
 * Tests the on-screen controls of the game page (world group, the town moving objects paused, the player placed on the
 * town return point before every button and the movement messages recorded on the server; the sample opacityEffect and
 * disableContextMenu are on, and the joystick controller registered by default sends a stop on every document mouse
 * release or touch end): every arrow button pressed walks the player on its axis and sign with one direction message,
 * gets the opacity class while pressed and its release stops the player, the same with a touch held on every button
 * from a page with touch support (the touch start and end sent with the Chromium input domain, Playwright only taps);
 * the mouse leaving a pressed button stops the player while the mouse is still down; a right click on the canvas prevents the browser menu; and on a page narrower than the
 * joystick media width (resized after the login, the joystick scrolled into view) the joystick replaces the arrow
 * buttons and its thumb drag walks right, adds the down axis on a diagonal, stops inside the threshold, walks up and
 * stops on the release (a drag from one direction straight to another keeps the first one, ISSUE #337).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { MovementScenario } = require('./helpers/movement-scenario');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovementControls
{

    static BUTTONS = [
        {dir: GameConst.UP, axis: 'y', sign: -1},
        {dir: GameConst.DOWN, axis: 'y', sign: 1},
        {dir: GameConst.LEFT, axis: 'x', sign: -1},
        {dir: GameConst.RIGHT, axis: 'x', sign: 1}
    ];
    static STOP_MESSAGE = {dir: '', act: GameConst.STOP};
    static OPACITY_CLASS = /button-opacity-off/;
    static HOLD_MS = 600;
    static CANVAS_CLICK_OFFSET = 100;
    static LOW_RESOLUTION = {width: 700, height: 900};
    static JOYSTICK_DRAG = 40;
    static JOYSTICK_INSIDE_THRESHOLD = 5;
    static CONTROLS_PATH = 'client/ui/controls';
    static MOUSE_INPUT = (page) => ({
        aim: async (button) => button.hover(),
        press: async () => page.mouse.down(),
        release: async () => page.mouse.up()
    });

    static async createTouchInput(page)
    {
        let cdpSession = await page.context().newCDPSession(page);
        return {
            aim: async () => true,
            press: async (button) => [await button.boundingBox()].map((box) => cdpSession.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{x: box.x + box.width / 2, y: box.y + box.height / 2}]
            })).pop(),
            release: async () => cdpSession.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []})
        };
    }

    static async pressButton(context, walkContext, buttonCase, input)
    {
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        let start = await walkContext.fetchPlayer();
        let button = context.page.locator('#'+buttonCase.dir);
        await input.aim(button);
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await input.press(button);
        await expect.poll(
            async () => Math.sign((await walkContext.fetchPlayer())[buttonCase.axis] - start[buttonCase.axis]),
            {message: 'The pressed '+buttonCase.dir+' button walks on its axis and sign', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(buttonCase.sign);
        await expect(button, 'The pressed button gets the opacity class').toHaveClass(TestMovementControls.OPACITY_CLASS);
        return button;
    }

    static async runButtonsTest(context, input)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        for(let buttonCase of TestMovementControls.BUTTONS){
            let button = await TestMovementControls.pressButton(context, walkContext, buttonCase, input);
            await context.page.waitForTimeout(TestMovementControls.HOLD_MS);
            await input.release();
            await MovementScenario.expectStillWithMessages(
                walkContext,
                [{dir: buttonCase.dir, act: ''}, TestMovementControls.STOP_MESSAGE, TestMovementControls.STOP_MESSAGE],
                'The '+buttonCase.dir+' button sends its direction once, the button and the page release send the stop'
            );
            await expect(button, 'The released button loses the opacity class').not.toHaveClass(
                TestMovementControls.OPACITY_CLASS
            );
        }
    }

    static async runMouseOutTest(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        let buttonCase = TestMovementControls.BUTTONS[3];
        let button = await TestMovementControls.pressButton(
            context,
            walkContext,
            buttonCase,
            TestMovementControls.MOUSE_INPUT(context.page)
        );
        await context.page.mouse.move(0, 0);
        await MovementScenario.expectStillWithMessages(
            walkContext,
            [{dir: buttonCase.dir, act: ''}, TestMovementControls.STOP_MESSAGE],
            'The mouse leaving the pressed button sends the stop while the mouse is still down'
        );
        await expect(button, 'The left button loses the opacity class').not.toHaveClass(
            TestMovementControls.OPACITY_CLASS
        );
        await context.page.mouse.up();
    }

    static async runContextMenuTest(context)
    {
        await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        await context.page.evaluate(() => {
            window.e2eContextMenus = [];
            window.e2eContextMenuBubbled = false;
            window.addEventListener('contextmenu', (event) => window.e2eContextMenus.push(event), true);
            window.addEventListener('contextmenu', () => {
                window.e2eContextMenuBubbled = true;
            });
        });
        let canvasBox = await context.page.locator(Selectors.canvas).boundingBox();
        await context.page.mouse.click(
            canvasBox.x + canvasBox.width / 2 + TestMovementControls.CANVAS_CLICK_OFFSET,
            canvasBox.y + canvasBox.height / 2,
            {button: 'right'}
        );
        expect(await context.page.evaluate(() => [
            window.e2eContextMenus.map((event) => event.defaultPrevented),
            window.e2eContextMenuBubbled
        ]), 'The right click menu is prevented and stopped on the page').toEqual([[true], false]);
    }

    static async enterLowResolution(context)
    {
        let walkContext = await MovementScenario.enterReadyRoom(context, Login.TOWN_ROOM_NAME);
        await context.page.setViewportSize(TestMovementControls.LOW_RESOLUTION);
        await expect(context.page.locator('#joystick'), 'The low resolution shows the joystick').toBeVisible();
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        await context.page.locator('#joystick').scrollIntoViewIfNeeded();
        let joystickBox = await context.page.locator('#joystick').boundingBox();
        walkContext.joystickCenter = {x: joystickBox.x + joystickBox.width / 2, y: joystickBox.y + joystickBox.height / 2};
        return walkContext;
    }

    static async dragJoystick(context, walkContext, offset, expectedSigns, message)
    {
        await context.page.mouse.move(walkContext.joystickCenter.x + offset.x, walkContext.joystickCenter.y + offset.y);
        await expect.poll(
            async () => MovementScenario.fetchVelocitySigns(walkContext),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expectedSigns);
    }

    static async enterTownWithControls(context, controlsOptions)
    {
        await InitialClientConfig.overrideBeforeEngine(context.page, TestMovementControls.CONTROLS_PATH, controlsOptions);
        let walkContext = await MovementScenario.enterReadyRoom(
            Object.assign({skipUiSelectors: false === controlsOptions.enabled}, context),
            Login.TOWN_ROOM_NAME
        );
        await MovementScenario.placePlayerOnReturnPoint(context.page, walkContext);
        return walkContext;
    }

    static async pressUpButton(context, walkContext, expectedMessages, message)
    {
        await context.page.locator('#'+GameConst.UP).hover();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.mouse.down();
        await context.page.waitForTimeout(TestMovementControls.HOLD_MS);
        await context.page.mouse.up();
        await MovementScenario.expectStillWithMessages(walkContext, expectedMessages, message);
    }

    static async runLowResolutionsJoystickOnlyTest(context)
    {
        let walkContext = await TestMovementControls.enterTownWithControls(
            context,
            {useJoystick: false, useJoystickOnLowResolutions: true}
        );
        let controlsBox = context.page.locator('.ui-box-controls-main-container');
        await expect(controlsBox, 'The controls box gets the joystick class').toHaveClass(/ui-box-joystick/);
        await expect(controlsBox, 'The controls box gets the low resolutions class').toHaveClass(
            /joystick-small-resolutions-only/
        );
        await TestMovementControls.pressUpButton(
            context,
            walkContext,
            [{dir: GameConst.UP, act: ''}, TestMovementControls.STOP_MESSAGE, TestMovementControls.STOP_MESSAGE],
            'The registered up button walks, the button and the joystick release send the stop'
        );
    }

    static async runControlsOffTest(context)
    {
        let walkContext = await TestMovementControls.enterTownWithControls(context, {enabled: false});
        await expect(context.page.locator('#'+GameConst.UP), 'The controls off show no arrow buttons').toHaveCount(0);
        await expect(context.page.locator('#joystick'), 'The controls off show no joystick').toHaveCount(0);
        let start = await walkContext.fetchPlayer();
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.keyboard.down('ArrowUp');
        await expect.poll(
            async () => start.y - (await walkContext.fetchPlayer()).y,
            {message: 'The up key still walks the player', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        await context.page.keyboard.up('ArrowUp');
        await MovementScenario.expectStillWithMessages(
            walkContext,
            [{dir: GameConst.UP, act: ''}, TestMovementControls.STOP_MESSAGE],
            'The up key sends its direction once and its release the stop'
        );
    }

    static async runLowResolutionTest(context)
    {
        await TestMovementControls.enterLowResolution(context);
        await expect(context.page.locator('.arrows-container'), 'The arrow buttons are hidden').toBeHidden();
    }

    static async runJoystickDragTest(context)
    {
        let walkContext = await TestMovementControls.enterLowResolution(context);
        let drag = TestMovementControls.JOYSTICK_DRAG;
        let inside = TestMovementControls.JOYSTICK_INSIDE_THRESHOLD;
        await GameplayE2eStateApi.recordMovementMessages(context.gameConfig, walkContext.playerName);
        await context.page.mouse.move(walkContext.joystickCenter.x, walkContext.joystickCenter.y);
        await context.page.mouse.down();
        await TestMovementControls.dragJoystick(context, walkContext, {x: drag, y: 0}, [1, 0], 'The right drag walks');
        await TestMovementControls.dragJoystick(context, walkContext, {x: drag, y: drag}, [1, 1], 'The diagonal drag');
        await TestMovementControls.dragJoystick(context, walkContext, {x: inside, y: inside}, [0, 0], 'Inside stops');
        await TestMovementControls.dragJoystick(context, walkContext, {x: 0, y: -drag}, [0, -1], 'The up drag walks');
        await context.page.mouse.up();
        await MovementScenario.expectStillWithMessages(
            walkContext,
            [
                {dir: GameConst.RIGHT, act: ''},
                {dir: GameConst.DOWN, act: ''},
                TestMovementControls.STOP_MESSAGE,
                {dir: GameConst.UP, act: ''},
                TestMovementControls.STOP_MESSAGE
            ],
            'The joystick sends every new direction once, the threshold stop and the release stop'
        );
    }

    static run()
    {
        test.describe('Movement Controls', () => {
            test('the low resolution shows the joystick instead of the arrow buttons', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementControls.runLowResolutionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the joystick drag walks every axis, stops inside the threshold and on the release', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementControls.runJoystickDragTest({page, gameConfig, e2eGroup, longRun});
            });
            test('every on-screen arrow button walks while pressed and its release stops the player', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementControls.runButtonsTest(
                    {page, gameConfig, e2eGroup, longRun},
                    TestMovementControls.MOUSE_INPUT(page)
                );
            });
            test('every on-screen arrow button held by a touch walks and its touch end stops the player', async ({ page, gameConfig, e2eGroup, longRun }) => {
                let touchPage = (await Login.openClientPage(page, gameConfig, {hasTouch: true})).clientPage;
                await TestMovementControls.runButtonsTest(
                    {page: touchPage, gameConfig, e2eGroup, longRun},
                    await TestMovementControls.createTouchInput(touchPage)
                );
            });
            test('the mouse leaving a pressed arrow button stops the player', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementControls.runMouseOutTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a right click on the canvas opens no browser menu', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementControls.runContextMenuTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with only the low resolutions joystick on the arrows walk and the box gets the joystick classes', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementControls.runLowResolutionsJoystickOnlyTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the controls off show no controls and the keyboard still walks the player', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestMovementControls.runControlsOffTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMovementControls.run();
