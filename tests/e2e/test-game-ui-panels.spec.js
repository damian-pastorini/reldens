/**
 *
 * Reldens - Test Game Ui Panels
 *
 * Tests the game UI panels and buttons: the settings and instructions panels reopened, the panels and buttons removed
 * by their config, the full screen button with and without the browser permission, the responsive positions on a
 * window resize and the own player name in the player box.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { E2eAssetsEndpoints } = require('./helpers/e2e-assets-endpoints');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestGameUiPanels
{

    static RESIZE_PX = 200;
    static SETTLE_MS = 1000;
    static GAME_FRAME = '.e2e-game-frame';
    static FULL_SCREEN_CLASS = new RegExp(GameConst.CLASSES.FULL_SCREEN_ON);
    static SETTINGS_POSITION = () => [
        window.reldens.gameEngine.uiScene.elementsUi.settings.x,
        window.reldens.gameEngine.uiScene.elementsUi.settings.y
    ];

    static async expectPanelToggle(page, openSelector, closeSelector, panelSelector)
    {
        for(let attempt of [1, 2]){
            await page.click(openSelector);
            await expect(page.locator(panelSelector), 'Open '+attempt).toBeVisible();
            await page.click(closeSelector);
            await expect(page.locator(panelSelector), 'Closed '+attempt).toBeHidden();
        }
    }

    static async loginWithoutUiChecks(page, gameConfig, longRun)
    {
        await Login.loginAndStartGame(page, gameConfig.e2eUsername, gameConfig.e2ePassword, gameConfig.e2ePlayerName, longRun, true);
        await expect(page.locator(Selectors.hud.chatOpen), 'The UI scene must be created').toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
    }

    static async resizeAndFetchSettingsPosition(page)
    {
        let viewport = page.viewportSize();
        await page.setViewportSize({
            width: viewport.width - TestGameUiPanels.RESIZE_PX,
            height: viewport.height - TestGameUiPanels.RESIZE_PX
        });
        await page.waitForTimeout(TestGameUiPanels.SETTLE_MS);
        return await page.evaluate(TestGameUiPanels.SETTINGS_POSITION);
    }

    static async runSettingsReopenTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await page.click(Selectors.hud.settingsOpen);
        await expect(page.locator(Selectors.hud.settingsOpen), 'The open button hides while open').toBeHidden();
        await page.click(Selectors.hud.settingsClose);
        await expect(page.locator(Selectors.hud.settingsOpen), 'The open button shows again').toBeVisible();
        await TestGameUiPanels.expectPanelToggle(
            page,
            Selectors.hud.settingsOpen,
            Selectors.hud.settingsClose,
            Selectors.hud.settingsUi
        );
        await screenshots.capture(page, 'settings-reopened');
    }

    static async runInstructionsReopenTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await TestGameUiPanels.expectPanelToggle(
            page,
            Selectors.hud.instructionsOpen,
            Selectors.hud.instructionsClose,
            Selectors.hud.instructions
        );
        await screenshots.capture(page, 'instructions-reopened');
    }

    static async runDisabledUiTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        for(let uiName of ['settings', 'instructions', 'playerBox', 'fullScreenButton']){
            await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/ui/'+uiName+'/enabled', false);
        }
        await TestGameUiPanels.loginWithoutUiChecks(page, gameConfig, longRun);
        for(let removedSelector of [
            Selectors.hud.settingsOpen,
            Selectors.hud.instructionsOpen,
            Selectors.hud.logout,
            Selectors.hud.fullScreen
        ]){
            await expect(page.locator(removedSelector), removedSelector).toHaveCount(0);
        }
        await screenshots.capture(page, 'disabled-ui-elements');
    }

    static async runFullScreenTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await page.evaluate(() => {
            window.e2eGameSizeUpdates = 0;
            window.reldens.events.on('reldens.updateGameSizeAfter', () => {
                window.e2eGameSizeUpdates++;
            });
        });
        await page.click(Selectors.hud.fullScreen);
        await expect(page.locator('body')).toHaveClass(TestGameUiPanels.FULL_SCREEN_CLASS);
        await expect.poll(async () => await page.evaluate(() => [
            document.fullscreenElement === document.body,
            0 < window.e2eGameSizeUpdates
        ]), {message: 'The body must be in full screen and the game resized'}).toEqual([true, true]);
        await screenshots.capture(page, 'full-screen-on');
        await page.click(Selectors.hud.fullScreen);
        await expect(page.locator('body')).not.toHaveClass(TestGameUiPanels.FULL_SCREEN_CLASS);
        await expect.poll(async () => await page.evaluate(() => null === document.fullscreenElement)).toBe(true);
    }

    static async runFullScreenNotAllowedTest(page, gameConfig, longRun)
    {
        await page.goto(E2eAssetsEndpoints.ASSETS_PATH+E2eAssetsEndpoints.FULL_SCREEN_DENIED_FRAME_FILE);
        let gameFrame = await (await page.locator(TestGameUiPanels.GAME_FRAME).elementHandle()).contentFrame();
        await Login.loginOnOpenPage(gameFrame, gameConfig.e2eUsername, gameConfig.e2ePassword, gameConfig.e2ePlayerName, longRun);
        await expect(gameFrame.locator(Selectors.hud.fullScreen)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        expect(await gameFrame.evaluate(() => document.fullscreenEnabled), 'The frame must not allow full screen').toBe(false);
        await gameFrame.click(Selectors.hud.fullScreen);
        await page.waitForTimeout(TestGameUiPanels.SETTLE_MS);
        await expect(gameFrame.locator('body')).not.toHaveClass(TestGameUiPanels.FULL_SCREEN_CLASS);
        expect(await gameFrame.evaluate(() => document.fullscreenElement)).toBe(null);
    }

    static async runResponsiveResizeTest(page, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let initialPosition = await page.evaluate(TestGameUiPanels.SETTINGS_POSITION);
        expect(await TestGameUiPanels.resizeAndFetchSettingsPosition(page), 'Moved with the new size').not.toEqual(
            initialPosition
        );
    }

    static async runNotResponsiveResizeTest(page, gameConfig, e2eGroup, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/ui/screen/responsive', false);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let configuredPosition = await page.evaluate(() => [
            window.reldens.config.get('client/ui/settings/x'),
            window.reldens.config.get('client/ui/settings/y')
        ]);
        expect(await page.evaluate(TestGameUiPanels.SETTINGS_POSITION), 'Configured position').toEqual(configuredPosition);
        expect(await TestGameUiPanels.resizeAndFetchSettingsPosition(page), 'Kept after the resize').toEqual(
            configuredPosition
        );
    }

    static async runPlayerBoxNameTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let playerId = await page.evaluate(() => window.reldens.playerData.id);
        await expect(page.locator(Selectors.hud.playerBoxName)).toHaveText(playerId+' - '+gameConfig.e2ePlayerName);
        await screenshots.capture(page, 'player-box-name');
    }

    static run()
    {
        test.describe('Game UI Panels', () => {
            test('settings panel reopens and its open button toggles', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameUiPanels.runSettingsReopenTest(page, screenshots, gameConfig, longRun);
            });
            test('instructions panel reopens after closing', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameUiPanels.runInstructionsReopenTest(page, screenshots, gameConfig, longRun);
            });
            test('disabled UI configs remove their panels and buttons', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestGameUiPanels.runDisabledUiTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('full screen button enters and exits full screen', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameUiPanels.runFullScreenTest(page, screenshots, gameConfig, longRun);
            });
            test('full screen button does nothing when the browser does not allow it', async ({ page, gameConfig, longRun }) => {
                await TestGameUiPanels.runFullScreenNotAllowedTest(page, gameConfig, longRun);
            });
            test('responsive UI moves the elements on a window resize', async ({ page, gameConfig, longRun }) => {
                await TestGameUiPanels.runResponsiveResizeTest(page, gameConfig, longRun);
            });
            test('responsive off keeps the configured positions on a window resize', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestGameUiPanels.runNotResponsiveResizeTest(page, gameConfig, e2eGroup, longRun);
            });
            test('own player name is shown in the player box', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameUiPanels.runPlayerBoxNameTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestGameUiPanels.run();
