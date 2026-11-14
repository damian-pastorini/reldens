/**
 *
 * Reldens - Test Locale Selector
 *
 * Tests the settings language selector: with a second locale seeded (enabled and with one snippet) the selector is
 * shown with the next login notification, the chosen locale is saved as the user locale while the current session
 * keeps its language, and it is the active locale on the next login (the page loads the game again, which ends the
 * previous session). A seeded locale disabled after the login is rejected by the server and the save error is shown
 * under the selector until the next change. The user locale rows are preserved and restored by the reset before the
 * seeded locale is deleted (LocaleSteps).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { LocaleSteps } = require('./helpers/locale-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Selectors } = require('./selectors');
const SnippetsTranslations = require('../../lib/snippets/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestLocaleSelector
{

    static SEEDED_LOCALE = {locale: 'es_ES', language_code: 'es', country_code: 'ES', enabled: 1};
    static SEEDED_SETTINGS_TITLE = 'Configuracion de idioma';

    static async seedLocale(gameConfig, e2eGroup)
    {
        return await LocaleSteps.seedLocale(gameConfig, e2eGroup, TestLocaleSelector.SEEDED_LOCALE, {
            'translator.title': TestLocaleSelector.SEEDED_SETTINGS_TITLE
        });
    }

    static async runSavedLocaleTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededLocale = await TestLocaleSelector.seedLocale(gameConfig, e2eGroup);
        await LocaleSteps.preserveUserLocales(gameConfig, e2eGroup, gameConfig.e2eUsername);
        let localeSelector = await LocaleSteps.loginAndOpenSettings(page, gameConfig, longRun);
        await expect(
            page.locator(Selectors.hud.settingsUi).getByText(SnippetsTranslations.translator.notification),
            'The next login notification is shown with the selector'
        ).toBeVisible();
        await screenshots.capture(page, 'locale-selector-visible');
        await localeSelector.selectOption(String(seededLocale.id));
        await LocaleSteps.expectSavedUserLocale(gameConfig, gameConfig.e2eUsername, seededLocale.id, longRun);
        await expect(page.locator(Selectors.hud.localeSettingsTitle), 'The current session keeps its language').toHaveText(
            SnippetsTranslations.translator.title
        );
        await screenshots.capture(page, 'locale-chosen');
        let savedLocaleSelector = await LocaleSteps.loginAndOpenSettings(page, gameConfig, longRun);
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
        let storedUserLocales = await LocaleSteps.preserveUserLocales(gameConfig, e2eGroup, gameConfig.e2eUsername);
        let localeSelector = await LocaleSteps.loginAndOpenSettings(page, gameConfig, longRun);
        await E2eSeedAndRestoreApi.updateCreatedRow(gameConfig, e2eGroup, 'locale', seededLocale.id, {enabled: 0});
        await localeSelector.selectOption(String(seededLocale.id));
        let saveError = page.locator(Selectors.hud.localeSaveError);
        await expect(saveError, 'The locale disabled after the login must show the save error').toBeVisible(
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        await expect(saveError).toHaveText(SnippetsTranslations.translator.saveError);
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLocale', {user_id: storedUserLocales[0].user_id}),
            'The user locale must not change when the chosen locale was disabled'
        ).toEqual(storedUserLocales);
        await screenshots.capture(page, 'locale-save-error-visible');
        let defaultLocaleId = await E2eSeedAndRestoreApi.fetchRowId(
            gameConfig,
            'locale',
            {locale: LocaleSteps.DEFAULT_LOCALE}
        );
        await localeSelector.selectOption(String(defaultLocaleId));
        await expect(saveError, 'The next language change must hide the save error').toBeHidden();
        await LocaleSteps.expectSavedUserLocale(gameConfig, gameConfig.e2eUsername, defaultLocaleId, longRun);
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
