/**
 *
 * Reldens - Registration Helper
 *
 * Fills and submits the account registration form, accepting the terms and conditions when they are displayed.
 *
 */

const { expect } = require('@playwright/test');
const { Selectors } = require('../selectors');
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

    static async submitRegistration(page, registrationData, longRun, screenshots)
    {
        let typeDelay = TimeConstants.typeDelay(longRun);
        let pauseMs = TimeConstants.pauseMs(longRun);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await screenshots.capture(page, 'register-form-visible');
        await page.locator(Selectors.register.username).pressSequentially(registrationData.username, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.register.email).pressSequentially(registrationData.email, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.register.password).pressSequentially(registrationData.password, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.register.rePassword).pressSequentially(
            registrationData.password,
            { delay: typeDelay }
        );
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'register-form-filled');
        await Registration.acceptTerms(page, longRun, screenshots);
        await page.hover(Selectors.register.submit);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.register.submit);
    }

}

module.exports.Registration = Registration;
