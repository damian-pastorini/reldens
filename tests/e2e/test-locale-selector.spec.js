/**
 *
 * Reldens - Test Locale Selector
 *
 * Tests the settings language selector: with a second locale seeded (enabled and with one snippet) the selector is
 * shown, the chosen locale is saved as the user locale and it is the active locale on the next login (the page loads the
 * game again, which ends the previous session). A seeded locale disabled after the login is rejected by the server and
 * the save error is shown under the selector until the next change. The user locale rows are preserved and restored by
 * the reset before the seeded locale is deleted.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestLocaleSelector
{

    static SEEDED_LOCALE = {locale: 'es_ES', language_code: 'es', country_code: 'ES', enabled: 1};
    static SEEDED_SETTINGS_TITLE = 'Configuracion de idioma';
    static SAVE_ERROR_TEXT = 'There was an error, the language change could not be saved.';
    static DEFAULT_LOCALE = 'en_US';

    static async seedLocale(gameConfig, e2eGroup)
    {
        let seededLocale = await E2eSeedAndRestoreApi.createRow(
            gameConfig,
            e2eGroup,
            'locale',
            TestLocaleSelector.SEEDED_LOCALE
        );
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'snippets', {
            locale_id: seededLocale.id,
            key: 'translator.title',
            value: TestLocaleSelector.SEEDED_SETTINGS_TITLE
        });
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/reload-locales', {group: e2eGroup});
        return seededLocale;
    }

    static async loginAndOpenSettings(page, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await page.click(Selectors.hud.settingsOpen);
        await expect(page.locator(Selectors.hud.settingsUi)).toBeVisible({timeout: uiTimeout});
        let localeSelector = page.locator(Selectors.hud.localeSelector);
        await expect(localeSelector, 'The selector must be shown with two available locales').toBeVisible(
            {timeout: uiTimeout}
        );
        return localeSelector;
    }

    static async expectSavedUserLocale(gameConfig, userId, localeId, longRun)
    {
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

    static async runSavedLocaleTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededLocale = await TestLocaleSelector.seedLocale(gameConfig, e2eGroup);
        let userId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'usersLocale', {user_id: userId});
        let localeSelector = await TestLocaleSelector.loginAndOpenSettings(page, gameConfig, longRun);
        await screenshots.capture(page, 'locale-selector-visible');
        await localeSelector.selectOption(String(seededLocale.id));
        await TestLocaleSelector.expectSavedUserLocale(gameConfig, userId, seededLocale.id, longRun);
        await screenshots.capture(page, 'locale-chosen');
        let savedLocaleSelector = await TestLocaleSelector.loginAndOpenSettings(page, gameConfig, longRun);
        await expect(savedLocaleSelector, 'The saved locale must be the selected option').toHaveValue(
            String(seededLocale.id)
        );
        await expect(page.locator(Selectors.hud.localeSettingsTitle)).toHaveText(
            TestLocaleSelector.SEEDED_SETTINGS_TITLE
        );
        await screenshots.capture(page, 'saved-locale-active-after-login');
    }

    static async runDisabledLocaleErrorTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededLocale = await TestLocaleSelector.seedLocale(gameConfig, e2eGroup);
        let userId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername});
        let storedUserLocales = await E2eSeedAndRestoreApi.preserveRows(
            gameConfig,
            e2eGroup,
            'usersLocale',
            {user_id: userId}
        );
        let localeSelector = await TestLocaleSelector.loginAndOpenSettings(page, gameConfig, longRun);
        await E2eSeedAndRestoreApi.updateCreatedRow(gameConfig, e2eGroup, 'locale', seededLocale.id, {enabled: 0});
        await localeSelector.selectOption(String(seededLocale.id));
        let saveError = page.locator(Selectors.hud.localeSaveError);
        await expect(saveError, 'The locale disabled after the login must show the save error').toBeVisible(
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        await expect(saveError).toHaveText(TestLocaleSelector.SAVE_ERROR_TEXT);
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLocale', {user_id: userId}),
            'The user locale must not change when the chosen locale was disabled'
        ).toEqual(storedUserLocales);
        await screenshots.capture(page, 'locale-save-error-visible');
        let defaultLocaleId = await E2eSeedAndRestoreApi.fetchRowId(
            gameConfig,
            'locale',
            {locale: TestLocaleSelector.DEFAULT_LOCALE}
        );
        await localeSelector.selectOption(String(defaultLocaleId));
        await expect(saveError, 'The next language change must hide the save error').toBeHidden();
        await TestLocaleSelector.expectSavedUserLocale(gameConfig, userId, defaultLocaleId, longRun);
        await screenshots.capture(page, 'locale-save-error-hidden-after-change');
    }

    static run()
    {
        test.describe('Locale Selector', () => {
            test('language selector saves the chosen locale for the next login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelector.runSavedLocaleTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('language selector shows an error when the chosen locale was disabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelector.runDisabledLocaleErrorTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestLocaleSelector.run();
