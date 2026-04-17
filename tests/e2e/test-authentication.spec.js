/**
 *
 * Reldens - Test Authentication
 *
 * Tests login, wrong password, guest login, and account registration flows.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthentication
{
    static async runWrongPasswordTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let typeDelay = longRun ? 150 : 0;
        let pauseMs = longRun ? 800 : 0;
        await page.goto('/');
        await page.waitForSelector(Selectors.login.form, { state: 'visible' });
        await screenshots.capture(page, 'login-form-visible');
        await page.locator(Selectors.login.username).click();
        await page.locator(Selectors.login.username).pressSequentially(username, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.login.password).click();
        await page.locator(Selectors.login.password).pressSequentially('wrong-password-xyz', { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'wrong-password-typed');
        await page.click(Selectors.login.submit);
        await expect(page.locator(Selectors.login.error)).toBeVisible({ timeout: longRun ? 30000 : 10000 });
        await screenshots.capture(page, 'error-message-visible');
    }

    static async runRegisterTest(page, screenshots, gameConfig, longRun)
    {
        let regUsername = gameConfig.e2eRegUsername || '';
        let regEmail = gameConfig.e2eRegEmail || '';
        let regPassword = gameConfig.e2eRegPassword || '';
        expect(regUsername, 'e2eRegUsername must be configured for registration test').toBeTruthy();
        expect(regEmail, 'e2eRegEmail must be configured for registration test').toBeTruthy();
        expect(regPassword, 'e2eRegPassword must be configured for registration test').toBeTruthy();
        let typeDelay = longRun ? 150 : 0;
        let pauseMs = longRun ? 800 : 0;
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await screenshots.capture(page, 'register-form-visible');
        await page.locator(Selectors.register.username).pressSequentially(regUsername, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.register.email).pressSequentially(regEmail, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.register.password).pressSequentially(regPassword, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.register.rePassword).pressSequentially(regPassword, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'register-form-filled');
        let termsVisible = await page.locator(Selectors.register.termsLinkContainer)
            .isVisible({ timeout: longRun ? 5000 : 2000 }).catch(() => false);
        if(termsVisible) {
            await page.locator(Selectors.register.termsLink).click();
            await page.waitForTimeout(pauseMs);
            await expect(page.locator(Selectors.register.termsBox)).toBeVisible({ timeout: 5000 });
            await screenshots.capture(page, 'terms-and-conditions-visible');
            await page.locator(Selectors.register.termsCheckbox).check();
            await page.waitForTimeout(pauseMs);
            await page.locator(Selectors.register.termsAcceptClose).first().click();
            await page.waitForTimeout(pauseMs);
        }
        await page.hover(Selectors.register.submit);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.register.submit);
        await page.waitForSelector(
            Selectors.characterSelect.container+':not(.hidden)',
            { timeout: longRun ? 60000 : 20000 }
        );
        await expect(page.locator(Selectors.characterSelect.container)).toBeVisible();
        await screenshots.capture(page, 'player-selection-after-register');
    }

    static async runGuestLoginTest(page, screenshots, longRun)
    {
        let typeDelay = longRun ? 150 : 0;
        let pauseMs = longRun ? 800 : 0;
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => {
            return !!(window.reldens && window.reldens.startHandler && window.reldens.config);
        }, { timeout: longRun ? 30000 : 15000 });
        let guestEnabled = await page.evaluate(() => {
            let allowGuest = window.reldens.config.getWithoutLogs('client/general/users/allowGuest', false);
            let availableGuestRooms = window.reldens.config.getWithoutLogs(
                'client/rooms/selection/availableRooms/registrationGuest',
                {}
            );
            return !!allowGuest && Object.keys(availableGuestRooms).length > 0;
        });
        test.skip(!guestEnabled, 'guest login disabled - allowGuest=false or no registrationGuest rooms configured');
        await expect(page.locator(Selectors.login.guestForm)).toBeVisible();
        await screenshots.capture(page, 'guest-form-visible');
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.login.guestSubmit);
        await page.waitForSelector(
            Selectors.characterSelect.newPlayerName,
            { state: 'visible', timeout: longRun ? 60000 : 20000 }
        );
        await screenshots.capture(page, 'guest-create-player-form');
        let guestPlayerName = 'Guest'+Date.now();
        await page.locator(Selectors.characterSelect.newPlayerName)
            .pressSequentially(guestPlayerName, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.hover(Selectors.characterSelect.createSubmit);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.characterSelect.createSubmit);
        await page.waitForSelector(Selectors.body.gameEngineStarted, { timeout: longRun ? 120000 : 60000 });
        await expect(page.locator(Selectors.canvas)).toBeVisible();
        await screenshots.capture(page, 'guest-in-game');
    }

    static run()
    {
        test.describe('Authentication', () => {

            test('wrong password shows error message', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthentication.runWrongPasswordTest(page, screenshots, gameConfig, longRun);
            });

            test(
                'register new account reaches player selection',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAuthentication.runRegisterTest(page, screenshots, gameConfig, longRun);
                }
            );

            test('guest login enters game when guest mode is enabled', async ({ page, screenshots, longRun }) => {
                await TestAuthentication.runGuestLoginTest(page, screenshots, longRun);
            });

            test(
                'double login disconnects first session',
                async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                    let username = gameConfig.e2eUsername || 'root';
                    let password = gameConfig.e2ePassword || 'root';
                    let playerName = gameConfig.e2ePlayerName || 'ImRoot';
                    await Login.loginAndStartGame(page, username, password, playerName, longRun, true);
                    await expect(page.locator(Selectors.canvas)).toBeVisible();
                    await screenshots.capture(page, 'p1-first-session-in-game');
                    page.on('dialog', async (dialog) => { await dialog.accept(); });
                    await Login.loginAndStartGame(secondPage, username, password, playerName, longRun, true);
                    await expect(secondPage.locator(Selectors.canvas)).toBeVisible();
                    await screenshots.capture(secondPage, 'p2-second-session-in-game');
                    await page.waitForFunction(
                        () => !document.body.classList.contains('game-started'),
                        { timeout: 5000 }
                    );
                    await expect(page.locator(Selectors.login.form)).toBeVisible();
                    await screenshots.capture(page, 'p1-disconnected-back-to-login');
                }
            );
        });
    }
}

TestAuthentication.run();
