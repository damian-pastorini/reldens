/**
 *
 * Reldens - Test Character Creation Flows
 *
 * Tests the players creation flows beyond the name: the invalid or missing initial state, the storage failure, the
 * forged and incomplete create messages, the forged creation of a user that has a player with the multiple players
 * off, a player state insert that fails after the player was stored (the player is deleted and the guest without
 * players creates its next player with the multiple players off, ISSUE #418), the creation with the game room connection closed, the chosen, unknown
 * (refused before the player is stored, with the class path not available message) and missing class paths with their
 * avatar, the avatar preview options and the missing classes.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CharacterCreation } = require('./helpers/character-creation');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCharacterCreationFlows
{

    static UNKNOWN_ID = 999999;
    static MISSING_CLASSES_MESSAGE = 'None configured classes available.';
    static CLASS_OPTION = '#class-path-select option';
    static MULTIPLE_PLAYERS_OFF_MESSAGE = 'Multiple players are not allowed, you already have a player.';
    static UNKNOWN_CLASS_PATH_MESSAGE = 'The selected class path is not available, please choose another one.';

    static async sendNameOnly(page, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.sendCreateMessage(page, {[CharacterCreation.NAME_FIELD_KEY]: playerName});
        return playerName;
    }

    static async fetchCreatedClassPath(gameConfig, playerName)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsOwnersClassPath', {
            owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})
        })).shift();
    }

    static async runInvalidInitialRoomTest(page, gameConfig, e2eGroup, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            'server/players/initialState/room_id',
            TestCharacterCreationFlows.UNKNOWN_ID
        );
        let playerName = await TestCharacterCreationFlows.sendNameOnly(page, gameConfig, longRun);
        await CharacterCreation.expectCreateError(page, CharacterCreation.INITIAL_STATE_MESSAGE, longRun);
        expect(await CharacterCreation.loadPlayers(gameConfig, playerName)).toEqual([]);
    }

    static async runMissingInitialStateTest(page, gameConfig, e2eGroup, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/players/initialState', null);
        let playerName = await TestCharacterCreationFlows.sendNameOnly(page, gameConfig, longRun);
        await CharacterCreation.expectCreateError(page, CharacterCreation.INITIAL_STATE_MESSAGE, longRun);
        expect(await CharacterCreation.loadPlayers(gameConfig, playerName)).toEqual([]);
    }

    static async runStorageFailureTest(page, screenshots, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/fail-creation', {});
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.expectCreateError(page, CharacterCreation.CREATION_ERROR_MESSAGE, longRun);
        expect(await CharacterCreation.loadPlayers(gameConfig, playerName)).toEqual([]);
        await screenshots.capture(page, 'creation-storage-failure');
    }

    static async runIgnoredMessagesTest(page, gameConfig, longRun)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.sendCreateMessage(page, {[CharacterCreation.NAME_FIELD_KEY]: 12345});
        await page.evaluate((createAction) => {
            window.reldens.gameRoom.send('*', {act: createAction});
        }, GameConst.CREATE_PLAYER);
        await page.waitForTimeout(CharacterCreation.NOTHING_SENT_WAIT_MS);
        await expect(page.locator(CharacterCreation.CREATE_ERROR), 'Nothing must be answered').toBeEmpty();
        expect(await CharacterCreation.loadPlayers(gameConfig, '12345')).toEqual([]);
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.sendCreateMessage(page, {[CharacterCreation.NAME_FIELD_KEY]: playerName});
        await CharacterCreation.waitForGameStart(page, longRun);
    }

    static async runForgedUserTest(page, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        let userId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername});
        let otherUserId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername2});
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.sendCreateMessage(page, {[CharacterCreation.NAME_FIELD_KEY]: playerName, user_id: otherUserId});
        await CharacterCreation.waitForGameStart(page, longRun);
        expect((await CharacterCreation.loadPlayers(gameConfig, playerName)).shift().user_id).toBe(userId);
    }

    static async runUnknownClassPathTest(page, screenshots, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.sendCreateMessage(page, {
            [CharacterCreation.NAME_FIELD_KEY]: playerName,
            class_path_select: String(TestCharacterCreationFlows.UNKNOWN_ID)
        });
        await CharacterCreation.expectCreateError(page, TestCharacterCreationFlows.UNKNOWN_CLASS_PATH_MESSAGE, longRun);
        expect(
            await CharacterCreation.loadPlayers(gameConfig, playerName),
            'The unknown class path is refused before the player is stored'
        ).toEqual([]);
        await screenshots.capture(page, 'creation-unknown-class-path');
        await CharacterCreation.sendCreateMessage(page, {[CharacterCreation.NAME_FIELD_KEY]: playerName});
        await CharacterCreation.waitForGameStart(page, longRun);
        expect(await CharacterCreation.loadPlayers(gameConfig, playerName), 'The same name created right after').toHaveLength(1);
    }

    static async runFailedStateRollbackTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/players/multiplePlayers/enabled', false);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/fail-state-creation', {});
        await DirectFormSubmit.enterGuestToCreation(page, longRun);
        let failedPlayerName = CharacterCreation.createPlayerName();
        await CharacterCreation.submitCreateForm(page, failedPlayerName);
        await CharacterCreation.expectCreateError(page, CharacterCreation.CREATION_ERROR_MESSAGE, longRun);
        expect(
            await CharacterCreation.loadPlayers(gameConfig, failedPlayerName),
            'The player stored before its state insert failed is deleted'
        ).toEqual([]);
        await screenshots.capture(page, 'creation-failed-state-rolled-back');
        let nextPlayerName = CharacterCreation.createPlayerName();
        await CharacterCreation.submitCreateForm(page, nextPlayerName);
        await CharacterCreation.waitForGameStart(page, longRun);
        expect(
            await CharacterCreation.loadPlayers(gameConfig, nextPlayerName),
            'The user without players creates its player after the failed one'
        ).toHaveLength(1);
    }

    static async runMultiplePlayersOffCreationTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let userId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername3});
        let userPlayers = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {user_id: userId});
        expect(userPlayers.length, 'The user already has a player').toBeGreaterThan(0);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/players/multiplePlayers/enabled', false);
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun, '3');
        await CharacterCreation.sendCreateMessage(page, {[CharacterCreation.NAME_FIELD_KEY]: playerName});
        await CharacterCreation.expectCreateError(page, TestCharacterCreationFlows.MULTIPLE_PLAYERS_OFF_MESSAGE, longRun);
        expect(await CharacterCreation.loadPlayers(gameConfig, playerName), 'No other player stored').toEqual([]);
        let storedPlayers = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {user_id: userId});
        expect(storedPlayers, 'The user players').toHaveLength(userPlayers.length);
        await screenshots.capture(page, 'multiple-players-off-creation-refused');
    }

    static async runChosenClassPathTest(page, screenshots, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        let chosenOption = page.locator(TestCharacterCreationFlows.CLASS_OPTION).nth(1);
        let chosenClass = {id: Number(await chosenOption.getAttribute('value')), key: await chosenOption.getAttribute('data-key')};
        await page.locator(CharacterCreation.CLASS_SELECT).selectOption(String(chosenClass.id));
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.waitForGameStart(page, longRun);
        let classPath = await TestCharacterCreationFlows.fetchCreatedClassPath(gameConfig, playerName);
        expect([classPath.class_path_id, classPath.currentLevel, classPath.currentExp]).toEqual([chosenClass.id, 1, 0]);
        let roomName = await page.evaluate(() => window.reldens.activeRoomEvents.roomName);
        expect((await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, playerName)).avatarKey).toBe(chosenClass.key);
        await screenshots.capture(page, 'chosen-class-path');
    }

    static async runDefaultClassPathTest(page, gameConfig, longRun)
    {
        let playerName = await TestCharacterCreationFlows.sendNameOnly(page, gameConfig, longRun);
        await CharacterCreation.waitForGameStart(page, longRun);
        let initialClassPathId = await E2eSeedAndRestoreApi.fetchConfigValue(
            gameConfig,
            'server/players/actions/initialClassPathId'
        );
        expect((await TestCharacterCreationFlows.fetchCreatedClassPath(gameConfig, playerName)).class_path_id).toBe(
            Number(initialClassPathId)
        );
    }

    static async runAvatarOptionsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        let secondOption = page.locator(TestCharacterCreationFlows.CLASS_OPTION).nth(1);
        await page.locator(CharacterCreation.CLASS_SELECT).selectOption(await secondOption.getAttribute('value'));
        await expect(page.locator(CharacterCreation.CLASS_AVATAR)).toHaveAttribute(
            'style',
            new RegExp(await secondOption.getAttribute('data-key'))
        );
        await screenshots.capture(page, 'class-avatar-preview');
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/players/multiplePlayers/showAvatar', false);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(CharacterCreation.CLASS_SELECT)).toBeVisible();
        await expect(page.locator(CharacterCreation.CLASS_AVATAR), 'The avatar must be hidden').toHaveCount(0);
    }

    static async runMissingClassesTest(page, screenshots, gameConfig, longRun)
    {
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/empty-classes', {});
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(GameConst.SELECTORS.PLAYER_SELECTION_ERRORS)).toContainText(
            TestCharacterCreationFlows.MISSING_CLASSES_MESSAGE
        );
        await expect(page.locator(CharacterCreation.CLASS_SELECT)).toHaveCount(0);
        await screenshots.capture(page, 'missing-classes');
    }

    static async runClosedConnectionTest(page, screenshots, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await page.evaluate(() => window.reldens.gameRoom.connection.close());
        await expect.poll(async () => await page.evaluate(() => window.reldens.gameRoom.connection.isOpen)).toBe(false);
        await CharacterCreation.submitCreateForm(page, playerName);
        await expect(page.locator(Selectors.reloadModal.message)).toHaveText(GameTranslations.game.errors.connectionLost, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        expect(await CharacterCreation.loadPlayers(gameConfig, playerName), 'No player stored').toEqual([]);
        await screenshots.capture(page, 'creation-connection-lost');
    }

    static run()
    {
        test.describe('Character Creation Flows', () => {
            test('creation with the game room connection closed shows the connection lost modal', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runClosedConnectionTest(page, screenshots, gameConfig, longRun);
            });
            test('invalid initial room shows the initial state error', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterCreationFlows.runInvalidInitialRoomTest(page, gameConfig, e2eGroup, longRun);
            });
            test('missing initial state shows the initial state error', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterCreationFlows.runMissingInitialStateTest(page, gameConfig, e2eGroup, longRun);
            });
            test('storage failure shows the creation error', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runStorageFailureTest(page, screenshots, gameConfig, longRun);
            });
            test('create messages without a valid name are ignored', async ({ page, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runIgnoredMessagesTest(page, gameConfig, longRun);
            });
            test('forged user id still creates the player on the authenticated user', async ({ page, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runForgedUserTest(page, gameConfig, longRun);
            });
            test('forged unknown class path shows the class path not available error and stores no player', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runUnknownClassPathTest(page, screenshots, gameConfig, longRun);
            });
            test('failed player state insert deletes the stored player and the next creation works with multiple players off', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterCreationFlows.runFailedStateRollbackTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('multiple players off refuses a forged creation of a user that has a player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterCreationFlows.runMultiplePlayersOffCreationTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('chosen class path is stored with its avatar', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runChosenClassPathTest(page, screenshots, gameConfig, longRun);
            });
            test('creation without a class path stores the initial class path', async ({ page, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runDefaultClassPathTest(page, gameConfig, longRun);
            });
            test('class selector updates the avatar and show avatar off hides it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterCreationFlows.runAvatarOptionsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('no classes available shows the missing classes error', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterCreationFlows.runMissingClassesTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestCharacterCreationFlows.run();
