/**
 *
 * Reldens - Registration Helper
 *
 * Fills and submits the account registration form, accepting the terms and conditions when they are displayed.
 *
 */

const { expect } = require('@playwright/test');
const { Selectors } = require('../selectors');
const { Navigation } = require('./navigation');
const { TimeConstants } = require('./time-constants');

class Registration
{

    static async acceptTerms(page, longRun, screenshots)
    {
        let pauseMs = TimeConstants.pauseMs(longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        let termsVisible = await page.locator(Selectors.register.termsLinkContainer)
            .isVisible({ timeout: uiTimeout }).catch(() => false);
        if(!termsVisible) {
            return false;
        }
        await page.locator(Selectors.register.termsLink).click();
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.register.termsBox)).toBeVisible({ timeout: uiTimeout });
        await screenshots.capture(page, 'terms-and-conditions-visible');
        await page.locator(Selectors.register.termsCheckbox).check();
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.register.termsAcceptClose).first().click();
        await page.waitForTimeout(pauseMs);
        return true;
    }

    static async typeValue(page, selector, value, longRun)
    {
        let typeDelay = TimeConstants.typeDelay(longRun);
        await page.locator(selector).pressSequentially(value, {
            delay: typeDelay,
            timeout: TimeConstants.forLongRun(TimeConstants.ACTION, longRun) + value.length * typeDelay
        });
    }

    static async submitRegistration(page, registrationData, longRun, screenshots)
    {
        let pauseMs = TimeConstants.pauseMs(longRun);
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
        await screenshots.capture(page, 'register-form-visible');
        await Registration.typeValue(page, Selectors.register.username, registrationData.username, longRun);
        await page.waitForTimeout(pauseMs);
        await Registration.typeValue(page, Selectors.register.email, registrationData.email, longRun);
        await page.waitForTimeout(pauseMs);
        await Registration.typeValue(page, Selectors.register.password, registrationData.password, longRun);
        await page.waitForTimeout(pauseMs);
        await Registration.typeValue(page, Selectors.register.rePassword, registrationData.password, longRun);
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'register-form-filled');
        await Registration.acceptTerms(page, longRun, screenshots);
        await page.hover(Selectors.register.submit);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.register.submit);
    }

    static async registerAndWaitForPlayerSelection(page, registrationData, longRun, screenshots)
    {
        await Registration.submitRegistration(page, registrationData, longRun, screenshots);
        await page.waitForSelector(
            Selectors.characterSelect.container+':not(.hidden)',
            {timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)}
        );
    }

}

module.exports.Registration = Registration;
