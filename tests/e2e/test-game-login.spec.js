/**
 *
 * Reldens - Test Game Login
 *
 * Tests the full login flow, game engine startup, and HUD visibility.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestGameLogin
{
    static run()
    {
        test.describe('Game Login Flow', () => {
            test('player can login and select character to start the game', async ({ page, screenshots, gameConfig, longRun }) => {
                await Login.loginRootPlayer(page, gameConfig, longRun);
                await page.waitForTimeout(TimeConstants.pauseMs(longRun));
                await expect(page.locator(Selectors.canvas)).toBeVisible();
                await screenshots.capture(page, 'game-canvas-visible');
            });
            test('settings panel opens and shows configuration options', async ({ page, screenshots, gameConfig, longRun }) => {
                await Login.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
                await page.click(Selectors.hud.settingsOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.hud.settingsUi)).toBeVisible();
                let settingsContainers = page.locator(Selectors.hud.settingsDynamic);
                await expect(settingsContainers.first(), 'The settings panel must show its options').toBeVisible();
                for(let settingsContainer of await settingsContainers.all()){
                    await expect(settingsContainer, 'Every settings section must be visible').toBeVisible();
                }
                await screenshots.capture(page, 'settings-panel-open');
                await page.click(Selectors.hud.settingsClose);
                await expect(page.locator(Selectors.hud.settingsUi)).not.toBeVisible();
                await screenshots.capture(page, 'settings-panel-closed');
            });
            test('instructions panel opens and shows content', async ({ page, screenshots, gameConfig, longRun }) => {
                await Login.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
                await page.click(Selectors.hud.instructionsOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.hud.instructions)).toBeVisible();
                await expect(page.locator(Selectors.hud.instructionsContent)).toBeVisible();
                await screenshots.capture(page, 'instructions-panel-open');
                await page.click(Selectors.hud.instructionsClose);
                await expect(page.locator(Selectors.hud.instructions)).toBeHidden();
                await screenshots.capture(page, 'instructions-panel-closed');
            });
            test('logout button returns user to login form', async ({ page, screenshots, gameConfig, longRun }) => {
                await Login.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
                await expect(page.locator(Selectors.canvas)).toBeVisible();
                await screenshots.capture(page, 'logged-in-before-logout');
                await page.click(Selectors.hud.logout);
                await page.waitForTimeout(2000 + pauseMs);
                await expect(page.locator(Selectors.login.form)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await expect(page.locator(Selectors.login.username)).toBeVisible();
                await screenshots.capture(page, 'login-form-visible-after-logout');
            });
        });
    }
}

TestGameLogin.run();
