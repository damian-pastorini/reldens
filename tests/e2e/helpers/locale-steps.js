/**
 *
 * Reldens - Locale Steps
 *
 * The steps of the locale selector specs: a locale seeded with its snippets for the group (the locales are reloaded on
 * the server, and again by the group reset), a locale row changed with its original values preserved and the locales
 * reloaded, the settings opened with the language selector returned, the login followed by the settings, the user
 * locale rows of a user polled until they hold the expected locale, and the active locale of the client translator.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');

class LocaleSteps
{

    static RELOAD_LOCALES_PATH = '/api/e2e/data/reload-locales';
    static DEFAULT_LOCALE = 'en_US';

    static async seedLocale(gameConfig, e2eGroup, localeRow, snippets)
    {
        let seededLocale = await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'locale', localeRow);
        await LocaleSteps.seedSnippets(gameConfig, e2eGroup, seededLocale.id, snippets);
        return seededLocale;
    }

    static async seedSnippets(gameConfig, e2eGroup, localeId, snippets)
    {
        for(let snippetKey of Object.keys(snippets)){
            await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'snippets', {
                locale_id: localeId,
                key: snippetKey,
                value: snippets[snippetKey]
            });
        }
        await SecurityApi.request(gameConfig, 'POST', LocaleSteps.RELOAD_LOCALES_PATH, {group: e2eGroup});
    }

    static async preserveUserLocales(gameConfig, e2eGroup, username)
    {
        return await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'usersLocale', {
            user_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username})
        });
    }

    static async updateLocale(gameConfig, e2eGroup, localeFilters, patch)
    {
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, e2eGroup, 'locale', localeFilters, patch);
        await SecurityApi.request(gameConfig, 'POST', LocaleSteps.RELOAD_LOCALES_PATH, {group: e2eGroup});
    }

    static async openSettings(page, longRun)
    {
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await page.locator(Selectors.hud.settingsOpen).waitFor({state: 'visible', timeout: uiTimeout});
        await page.click(Selectors.hud.settingsOpen);
        await expect(page.locator(Selectors.hud.settingsUi)).toBeVisible({timeout: uiTimeout});
        return page.locator(Selectors.hud.localeSelector);
    }

    static async loginAndOpenSettings(page, gameConfig, longRun, userKeySuffix = '')
    {
        await Login.loginRootPlayer(page, gameConfig, longRun, userKeySuffix);
        let localeSelector = await LocaleSteps.openSettings(page, longRun);
        await expect(localeSelector, 'The selector must be shown with more than one available locale').toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun)
        });
        return localeSelector;
    }

    static async expectSavedUserLocale(gameConfig, username, localeId, longRun)
    {
        let userId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username});
        await expect.poll(
            async () => (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLocale', {user_id: userId})).map(
                userLocale => userLocale.locale_id
            ),
            {
                message: 'The chosen locale must be saved as the only user locale',
                timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
            }
        ).toEqual([localeId]);
    }

    static async fetchClientLocale(page)
    {
        return await page.evaluate(() => ({
            activeLocale: window.reldens.services.translator.activeLocale,
            userLocale: window.reldens.initialGameData.userLocale?.locale || false
        }));
    }

}

module.exports.LocaleSteps = LocaleSteps;
