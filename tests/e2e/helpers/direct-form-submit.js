/**
 *
 * Reldens - Direct Form Submit
 *
 * Sends the login, registration and guest requests directly through the game manager, as a modified client would do
 * it, so the values the browser forms never let through still reach the server, and asserts the shown outcome.
 *
 */

const { expect } = require('@playwright/test');
const { Navigation } = require('./navigation');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');

class DirectFormSubmit
{

    static REGISTER_FORM_ID = 'register-form';
    static LOGIN_FORM_ID = 'login-form';
    static GUEST_FORM_ID = 'guest-form';
    static VALID_PASSWORD = 'E2ePassword1';
    static VISIBLE_SELECTION = Selectors.characterSelect.container+':not(.hidden)';

    static createUniqueName()
    {
        return 'e2ereg'+Date.now().toString(36);
    }

    static createRegistration(username, email, password)
    {
        return {formId: DirectFormSubmit.REGISTER_FORM_ID, username, email, password, rePassword: password};
    }

    static async openPage(page)
    {
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
    }

    static async startGame(page, formData, isNewUser)
    {
        await page.evaluate((submitData) => {
            window.reldens.startGame(submitData.formData, submitData.isNewUser);
        }, {formData, isNewUser});
    }

    static async submit(page, formData, isNewUser)
    {
        await DirectFormSubmit.openPage(page);
        await DirectFormSubmit.startGame(page, formData, isNewUser);
    }

    static async enterGuestToCreation(page, longRun)
    {
        await DirectFormSubmit.openPage(page);
        await page.click(Selectors.login.guestSubmit);
        await page.waitForSelector(Selectors.characterSelect.newPlayerName, {
            state: 'visible',
            timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)
        });
    }

    static async expectFormError(page, errorSelector, longRun, label)
    {
        await expect(page.locator(errorSelector), label).not.toBeEmpty({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await expect(page.locator(DirectFormSubmit.VISIBLE_SELECTION), label).toHaveCount(0);
    }

    static async expectPlayerSelection(page, longRun, label)
    {
        await expect(page.locator(DirectFormSubmit.VISIBLE_SELECTION), label).toHaveCount(1, {
            timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)
        });
    }

}

module.exports.DirectFormSubmit = DirectFormSubmit;
