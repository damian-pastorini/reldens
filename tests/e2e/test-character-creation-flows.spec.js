/**
 *
 * Reldens - Test Character Creation Flows
 *
 * Tests the players creation flows beyond the name: the invalid or missing initial state, the storage failure, the
 * forged and incomplete create messages, the chosen
 * and missing class paths with their avatar, the avatar preview options and the missing classes.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CharacterCreation } = require('./helpers/character-creation');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCharacterCreationFlows
{

    static UNKNOWN_ID = 999999;
    static MISSING_CLASSES_MESSAGE = 'None configured classes available.';
    static CLASS_OPTION = '#class-path-select option';

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

    static run()
    {
        test.describe('Character Creation Flows', () => {
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
