/**
 *
 * Reldens - Test Locale Selector Sessions
 *
 * Tests the language selector across the session states (exclusive group, it uses the shared sample es_ES locale): a
 * locale chosen right before a page reload is saved and active on the next login; a change sent after the connection
 * closed shows the connection lost reload modal and saves nothing; a dead player saves its chosen locale; and a guest
 * saves its locale and gets it on its next login (from a second page, a guest can only log in again while its first
 * session is in the game). The user locale rows of the group users are preserved and restored by the group reset
 * (LocaleSteps).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { LocaleSteps } = require('./helpers/locale-steps');
const { Login } = require('./helpers/login');
const { CharacterCreation } = require('./helpers/character-creation');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestLocaleSelectorSessions
{

    static SPANISH_LOCALE = 'es_ES';

    static async prepareSpanishChange(context)
    {
        let gameConfig = context.gameConfig;
        return {
            spanishId: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'locale', {
                locale: TestLocaleSelectorSessions.SPANISH_LOCALE
            }),
            storedUserLocales: await LocaleSteps.preserveUserLocales(gameConfig, context.e2eGroup, gameConfig.e2eUsername),
            localeSelector: await LocaleSteps.loginAndOpenSettings(context.page, gameConfig, context.longRun)
        };
    }

    static async expectSpanishActive(page, message)
    {
        expect(await LocaleSteps.fetchClientLocale(page), message).toEqual({
            activeLocale: TestLocaleSelectorSessions.SPANISH_LOCALE,
            userLocale: TestLocaleSelectorSessions.SPANISH_LOCALE
        });
    }

    static async runReloadAfterChangeTest(context)
    {
        let gameConfig = context.gameConfig;
        let spanishChange = await TestLocaleSelectorSessions.prepareSpanishChange(context);
        await spanishChange.localeSelector.selectOption(String(spanishChange.spanishId));
        await context.page.reload();
        await LocaleSteps.expectSavedUserLocale(gameConfig, gameConfig.e2eUsername, spanishChange.spanishId, context.longRun);
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TestLocaleSelectorSessions.expectSpanishActive(context.page, 'The locale chosen before the reload is active');
    }

    static async runClosedConnectionTest(context)
    {
        let spanishChange = await TestLocaleSelectorSessions.prepareSpanishChange(context);
        await context.page.evaluate(() => window.reldens.activeRoomEvents.room.connection.close());
        await expect.poll(async () => await context.page.evaluate(
            () => window.reldens.activeRoomEvents.room.connection.transport.ws.readyState
        ), {message: 'The connection is closed'}).toBe(WebSocket.CLOSED);
        await spanishChange.localeSelector.selectOption(String(spanishChange.spanishId));
        await expect(context.page.locator(Selectors.reloadModal.message), 'The reload modal').toHaveText(
            GameTranslations.game.errors.connectionLost,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        expect(
            await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'usersLocale', {
                user_id: spanishChange.storedUserLocales[0].user_id
            }),
            'Nothing is saved after the connection closed'
        ).toEqual(spanishChange.storedUserLocales);
    }

    static async runDeadPlayerTest(context)
    {
        let gameConfig = context.gameConfig;
        let spanishChange = await TestLocaleSelectorSessions.prepareSpanishChange(context);
        await GameplayE2eStateApi.setPlayerState(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            gameConfig.e2ePlayerName,
            GameConst.STATUS.DEATH
        );
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName)).inState,
            {message: 'The player is dead'}
        ).toBe(GameConst.STATUS.DEATH);
        await spanishChange.localeSelector.selectOption(String(spanishChange.spanishId));
        await LocaleSteps.expectSavedUserLocale(gameConfig, gameConfig.e2eUsername, spanishChange.spanishId, context.longRun);
    }

    static async runGuestLocaleTest(context)
    {
        let spanishId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'locale', {
            locale: TestLocaleSelectorSessions.SPANISH_LOCALE
        });
        let guest = await CharacterCreation.enterGuestInGame(context.page, context.longRun, Login.TOWN_ROOM_NAME);
        let localeSelector = await LocaleSteps.openSettings(context.page, context.longRun);
        await localeSelector.selectOption(String(spanishId));
        await LocaleSteps.expectSavedUserLocale(context.gameConfig, guest.username, spanishId, context.longRun);
        await Login.loginAndStartGame(context.secondPage, guest.username, guest.password, guest.playerName, context.longRun);
        await TestLocaleSelectorSessions.expectSpanishActive(
            context.secondPage,
            'The guest locale is active on its next login'
        );
    }

    static run()
    {
        test.describe('Locale Selector Sessions', () => {
            test('locale chosen right before a reload is active on the next login', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorSessions.runReloadAfterChangeTest({page, gameConfig, e2eGroup, longRun});
            });
            test('change after the connection closed shows the reload modal and saves nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorSessions.runClosedConnectionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('dead player saves its chosen locale', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorSessions.runDeadPlayerTest({page, gameConfig, e2eGroup, longRun});
            });
            test('guest saves its locale and gets it on its next login', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestLocaleSelectorSessions.runGuestLocaleTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestLocaleSelectorSessions.run();
