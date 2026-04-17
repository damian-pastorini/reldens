/**
 *
 * Reldens - Test Game Login
 *
 * Tests the full login flow, game engine startup, and HUD visibility.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestGameLogin
{
    static async loginRootPlayer(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static run()
    {
        test.describe('Game Login Flow', () => {

            test('player can login and select character to start the game', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameLogin.loginRootPlayer(page, gameConfig, longRun);
                await page.waitForTimeout(longRun ? 5000 : 0);
                await expect(page.locator(Selectors.canvas)).toBeVisible();
                await screenshots.capture(page, 'game-canvas-visible');
            });

            test('settings panel opens and shows configuration options', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameLogin.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
                await page.click(Selectors.hud.settingsOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.hud.settingsUi)).toBeVisible();
                await expect(page.locator(Selectors.hud.settingsDynamic)).toBeVisible();
                await screenshots.capture(page, 'settings-panel-open');
                await page.click(Selectors.hud.settingsClose);
                await expect(page.locator(Selectors.hud.settingsUi)).not.toBeVisible();
                await screenshots.capture(page, 'settings-panel-closed');
            });

            test('instructions panel opens and shows content', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameLogin.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
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
                await TestGameLogin.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
                await expect(page.locator(Selectors.canvas)).toBeVisible();
                await screenshots.capture(page, 'logged-in-before-logout');
                await page.click(Selectors.hud.logout);
                await page.waitForTimeout(2000 + pauseMs);
                await expect(page.locator(Selectors.login.form)).toBeVisible({ timeout: 10000 });
                await expect(page.locator(Selectors.login.username)).toBeVisible();
                await screenshots.capture(page, 'login-form-visible-after-logout');
            });

        });
    }
}

TestGameLogin.run();
