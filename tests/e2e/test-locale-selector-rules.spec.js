/**
 *
 * Reldens - Test Locale Selector Rules
 *
 * Tests the language selector rules (exclusive group, the locales rows and their reload are shared by the server): with
 * the sample es_ES locale disabled only the default locale is left and no selector is shown; a guest with no user
 * locale gets the default locale; a saved locale disabled later is not applied on the next login; the options show the
 * country code, or the locale code when it has none, with the active locale selected; a language change in a room with
 * every action disabled, or with the language change in its disallowed actions, shows the save error (translated in
 * the active locale) and saves nothing; after a scene change the save error of a rejected change is still shown; and a
 * rejected change shows the error only to the player that sent it. The locale, snippets, user locale and room custom
 * data changes are created or preserved for the group and restored by the group reset (LocaleSteps).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { LocaleSteps } = require('./helpers/locale-steps');
const { Login } = require('./helpers/login');
const { CharacterCreation } = require('./helpers/character-creation');
const { TeamSteps } = require('./helpers/team-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { SnippetsConst } = require('../../lib/snippets/constants');
const SnippetsTranslations = require('../../lib/snippets/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestLocaleSelectorRules
{

    static SPANISH_LOCALE = 'es_ES';
    static SPANISH_SAVE_ERROR = 'E2E error, el idioma no se pudo guardar.';
    static OPTIONS_LOCALES = [
        {locale: 'pt_BR', language_code: 'pt', country_code: 'BR', enabled: 1},
        {locale: 'fr_FR', language_code: 'fr', country_code: null, enabled: 1}
    ];
    static SCENE_CHANGE_LOCALE = {locale: 'it_IT', language_code: 'it', country_code: 'IT', enabled: 1};

    static async fetchLocaleIds(gameConfig)
    {
        return {
            spanish: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'locale', {
                locale: TestLocaleSelectorRules.SPANISH_LOCALE
            }),
            defaultLocale: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'locale', {locale: LocaleSteps.DEFAULT_LOCALE})
        };
    }

    static async expectSaveError(page, errorText, message)
    {
        let saveError = page.locator(Selectors.hud.localeSaveError);
        await expect(saveError, message).toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
        await expect(saveError, message).toHaveText(errorText);
    }

    static async runSingleLocaleTest(context)
    {
        await LocaleSteps.updateLocale(
            context.gameConfig,
            context.e2eGroup,
            {locale: TestLocaleSelectorRules.SPANISH_LOCALE},
            {enabled: 0}
        );
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await LocaleSteps.openSettings(context.page, context.longRun);
        await expect(context.page.locator(Selectors.hud.localeSelector), 'No selector with one locale').toHaveCount(0);
    }

    static async runGuestDefaultLocaleTest(context)
    {
        let guest = await CharacterCreation.enterGuestInGame(context.page, context.longRun, Login.TOWN_ROOM_NAME);
        let guestUserId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'users', {username: guest.username});
        expect(
            await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'usersLocale', {user_id: guestUserId}),
            'The guest has no user locale'
        ).toEqual([]);
        expect(await LocaleSteps.fetchClientLocale(context.page), 'The default locale is active').toEqual({
            activeLocale: LocaleSteps.DEFAULT_LOCALE,
            userLocale: false
        });
    }

    static async runDisabledSavedLocaleTest(context)
    {
        let gameConfig = context.gameConfig;
        let localeIds = await TestLocaleSelectorRules.fetchLocaleIds(gameConfig);
        await LocaleSteps.preserveUserLocales(gameConfig, context.e2eGroup, gameConfig.e2eUsername);
        let localeSelector = await LocaleSteps.loginAndOpenSettings(context.page, gameConfig, context.longRun);
        await localeSelector.selectOption(String(localeIds.spanish));
        await LocaleSteps.expectSavedUserLocale(gameConfig, gameConfig.e2eUsername, localeIds.spanish, context.longRun);
        await LocaleSteps.updateLocale(
            gameConfig,
            context.e2eGroup,
            {locale: TestLocaleSelectorRules.SPANISH_LOCALE},
            {enabled: 0}
        );
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        expect(await LocaleSteps.fetchClientLocale(context.page), 'The disabled saved locale is not applied').toEqual({
            activeLocale: LocaleSteps.DEFAULT_LOCALE,
            userLocale: false
        });
    }

    static async runOptionsLabelsTest(context)
    {
        let gameConfig = context.gameConfig;
        for(let localeRow of TestLocaleSelectorRules.OPTIONS_LOCALES){
            await LocaleSteps.seedLocale(gameConfig, context.e2eGroup, localeRow, {'translator.title': localeRow.locale});
        }
        let localeSelector = await LocaleSteps.loginAndOpenSettings(context.page, gameConfig, context.longRun);
        let enabledLocales = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'locale', {enabled: 1});
        expect(
            await localeSelector.locator('option').allTextContents(),
            'Each option shows its country code or its locale code'
        ).toEqual(enabledLocales.map(localeRow => localeRow.country_code || localeRow.locale));
        await expect(localeSelector, 'The active locale is the selected option').toHaveValue(
            String((await TestLocaleSelectorRules.fetchLocaleIds(gameConfig)).defaultLocale)
        );
    }

    static async runBlockedSaveTest(context)
    {
        let gameConfig = context.gameConfig;
        let localeIds = await TestLocaleSelectorRules.fetchLocaleIds(gameConfig);
        let storedUserLocales = await LocaleSteps.preserveUserLocales(gameConfig, context.e2eGroup, gameConfig.e2eUsername);
        let localeSelector = await LocaleSteps.loginAndOpenSettings(context.page, gameConfig, context.longRun);
        let blockingRules = [
            {allActionsDisabled: true},
            {allActionsDisabled: false, disallowedActions: [SnippetsConst.ACTIONS.UPDATE]}
        ];
        let chosenLocales = [localeIds.spanish, localeIds.defaultLocale];
        for(let ruleIndex = 0; ruleIndex < blockingRules.length; ruleIndex++){
            await GameplayE2eStateApi.changeRoomCustomData(
                gameConfig,
                context.e2eGroup,
                Login.TOWN_ROOM_NAME,
                blockingRules[ruleIndex]
            );
            await localeSelector.selectOption(String(chosenLocales[ruleIndex]));
            await TestLocaleSelectorRules.expectSaveError(
                context.page,
                SnippetsTranslations.translator.saveError,
                'The blocked language change shows the save error'
            );
            expect(
                await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLocale', {user_id: storedUserLocales[0].user_id}),
                'The blocked language change saves nothing'
            ).toEqual(storedUserLocales);
        }
    }

    static async runTranslatedSaveErrorTest(context)
    {
        let gameConfig = context.gameConfig;
        let localeIds = await TestLocaleSelectorRules.fetchLocaleIds(gameConfig);
        await LocaleSteps.seedSnippets(gameConfig, context.e2eGroup, localeIds.spanish, {
            'translator.saveError': TestLocaleSelectorRules.SPANISH_SAVE_ERROR
        });
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'usersLocale', {
            user_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername})
        }, {locale_id: localeIds.spanish});
        let localeSelector = await LocaleSteps.loginAndOpenSettings(context.page, gameConfig, context.longRun);
        await GameplayE2eStateApi.changeRoomCustomData(gameConfig, context.e2eGroup, Login.TOWN_ROOM_NAME, {
            allActionsDisabled: true
        });
        await localeSelector.selectOption(String(localeIds.defaultLocale));
        await TestLocaleSelectorRules.expectSaveError(
            context.page,
            TestLocaleSelectorRules.SPANISH_SAVE_ERROR,
            'The save error in the active locale'
        );
    }

    static async seedSceneChangeLocale(context)
    {
        let sceneLocale = await LocaleSteps.seedLocale(
            context.gameConfig,
            context.e2eGroup,
            TestLocaleSelectorRules.SCENE_CHANGE_LOCALE,
            {'translator.title': TestLocaleSelectorRules.SCENE_CHANGE_LOCALE.locale}
        );
        await LocaleSteps.preserveUserLocales(context.gameConfig, context.e2eGroup, context.gameConfig.e2eUsername);
        return sceneLocale;
    }

    static async runSceneChangeSaveErrorTest(context)
    {
        let gameConfig = context.gameConfig;
        let sceneLocale = await TestLocaleSelectorRules.seedSceneChangeLocale(context);
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TeamSteps.changeScene(context, {page: context.page, playerName: gameConfig.e2ePlayerName});
        await E2eSeedAndRestoreApi.updateCreatedRow(gameConfig, context.e2eGroup, 'locale', sceneLocale.id, {enabled: 0});
        let localeSelector = await LocaleSteps.openSettings(context.page, context.longRun);
        await localeSelector.selectOption(String(sceneLocale.id));
        await TestLocaleSelectorRules.expectSaveError(
            context.page,
            SnippetsTranslations.translator.saveError,
            'The save error after the scene change'
        );
    }

    static async runOwnSaveErrorTest(context)
    {
        let gameConfig = context.gameConfig;
        let sceneLocale = await TestLocaleSelectorRules.seedSceneChangeLocale(context);
        let localeSelector = await LocaleSteps.loginAndOpenSettings(context.page, gameConfig, context.longRun);
        await LocaleSteps.loginAndOpenSettings(context.secondPage, gameConfig, context.longRun, '2');
        await E2eSeedAndRestoreApi.updateCreatedRow(gameConfig, context.e2eGroup, 'locale', sceneLocale.id, {enabled: 0});
        await localeSelector.selectOption(String(sceneLocale.id));
        await TestLocaleSelectorRules.expectSaveError(
            context.page,
            SnippetsTranslations.translator.saveError,
            'The rejected change shows the error'
        );
        await expect(context.secondPage.locator(Selectors.hud.localeSaveError), 'No error for the other player')
            .toBeHidden();
    }

    static run()
    {
        test.describe('Locale Selector Rules', () => {
            test('only the default locale left shows no language selector', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runSingleLocaleTest({page, gameConfig, e2eGroup, longRun});
            });
            test('guest with no user locale gets the default locale', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runGuestDefaultLocaleTest({page, gameConfig, e2eGroup, longRun});
            });
            test('saved locale disabled later is not applied on the next login', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runDisabledSavedLocaleTest({page, gameConfig, e2eGroup, longRun});
            });
            test('options show the country code or the locale code and the active locale is selected', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runOptionsLabelsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('language change blocked by the room actions shows the save error and saves nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runBlockedSaveTest({page, gameConfig, e2eGroup, longRun});
            });
            test('save error is shown in the active locale', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runTranslatedSaveErrorTest({page, gameConfig, e2eGroup, longRun});
            });
            test('save error of a rejected change is shown after a scene change', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runSceneChangeSaveErrorTest({page, gameConfig, e2eGroup, longRun});
            });
            test('rejected change shows the error only to its player', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorRules.runOwnSaveErrorTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestLocaleSelectorRules.run();
