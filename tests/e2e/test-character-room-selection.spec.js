/**
 *
 * Reldens - Test Character Room Selection
 *
 * Tests the rooms offered on the players creation and selection forms: the creation room, the scene selectors with the
 * last location, the stored selected room, a single room, the guest rooms, the unavailable rooms, a room removed while
 * the selectors are open, the feature rooms left after a rejected join and the forged selected scene.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CharacterCreation } = require('./helpers/character-creation');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { RoomsConst } = require('../../lib/rooms/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCharacterRoomSelection
{

    static SELECTOR_SCENE_SELECT = '#player-selector-form .scene-select';
    static SELECTOR_SCENE_SINGLE = '#player-selector-form .scene-select-single';
    static CREATE_SCENE_SINGLE = '#player-create-form .scene-select-single';
    static UNKNOWN_ROOM_NAME = 'e2e-not-a-room';

    static async expectSelectionJoinError(page, roomName, longRun)
    {
        await expect(page.locator(GameConst.SELECTORS.PLAYER_SELECTION_ERRORS)).toHaveText(
            GameTranslations.game.errors.joiningRoom.replace('%joinRoomName', roomName),
            {timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)}
        );
    }

    static async createForestPlayer(page, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.createPlayerInRoom(page, gameConfig, longRun, playerName, Login.FOREST_ROOM_NAME);
        return playerName;
    }

    static async runRegistrationRoomTest(page, screenshots, gameConfig, longRun)
    {
        let playerName = await TestCharacterRoomSelection.createForestPlayer(page, gameConfig, longRun);
        expect(await Navigation.getCurrentRoomName(page)).toBe(Login.FOREST_ROOM_NAME);
        expect((await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName)).scene).toBe(
            Login.FOREST_ROOM_NAME
        );
        await screenshots.capture(page, 'created-in-selected-room');
    }

    static async runUnknownCreationRoomTest(page, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.sendCreateMessage(page, {
            [CharacterCreation.NAME_FIELD_KEY]: playerName,
            selectedScene: TestCharacterRoomSelection.UNKNOWN_ROOM_NAME
        });
        await CharacterCreation.waitForGameStart(page, longRun);
        let initialRoomId = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/players/initialState/room_id');
        expect((await CharacterCreation.fetchPlayerState(gameConfig, playerName)).room_id).toBe(Number(initialRoomId));
    }

    static async runSceneSelectorsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        let lastLocationOption = 'option[value="'+RoomsConst.ROOM_LAST_LOCATION_KEY+'"]';
        await expect(page.locator(TestCharacterRoomSelection.SELECTOR_SCENE_SELECT+' '+lastLocationOption)).toHaveCount(1);
        await expect(page.locator(CharacterCreation.CREATE_SCENE_SELECT+' '+lastLocationOption)).toHaveCount(0);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/rooms/selection/allowOnLogin', false);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(TestCharacterRoomSelection.SELECTOR_SCENE_SELECT), 'No selector scene').toHaveCount(0);
        await screenshots.capture(page, 'scene-selectors');
    }

    static async runStoredRoomTest(page, gameConfig, longRun)
    {
        let credentials = [gameConfig.e2eUsername, gameConfig.e2ePassword, gameConfig.e2ePlayerName, longRun, true];
        await Login.loginAndStartGame(page, ...credentials, Login.FOREST_ROOM_NAME);
        expect(await Navigation.getCurrentRoomName(page)).toBe(Login.FOREST_ROOM_NAME);
        await Login.loginAndStartGame(page, ...credentials, RoomsConst.ROOM_LAST_LOCATION_KEY);
        expect(await Navigation.getCurrentRoomName(page), 'The selected room must stay stored').toBe(Login.FOREST_ROOM_NAME);
    }

    static async runSingleRoomTest(page, gameConfig, e2eGroup, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/rooms/selection/loginLastLocation', false);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/single-login-room', {});
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(TestCharacterRoomSelection.SELECTOR_SCENE_SINGLE)).toHaveCount(1);
        await expect(page.locator(TestCharacterRoomSelection.SELECTOR_SCENE_SELECT)).toHaveCount(0);
    }

    static async runGuestRoomsTest(page, gameConfig, longRun)
    {
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/single-guest-registration-room', {});
        await DirectFormSubmit.enterGuestToCreation(page, longRun);
        await expect(page.locator(TestCharacterRoomSelection.CREATE_SCENE_SINGLE), 'One guest room').toHaveCount(1);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(CharacterCreation.CREATE_SCENE_SELECT), 'Every room for the user').toHaveCount(1);
    }

    static async runUnavailableLabelsTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let unavailableLabel = GameTranslations.game.roomUnavailableLabel;
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/rooms-unavailable', {});
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(
            page.locator(TestCharacterRoomSelection.SELECTOR_SCENE_SELECT+' option').filter({hasText: unavailableLabel})
        ).not.toHaveCount(0);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/rooms/selection/allowOnLogin', false);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(Selectors.characterSelect.option).filter({hasText: unavailableLabel})).not.toHaveCount(0);
        await screenshots.capture(page, 'unavailable-room-labels');
    }

    static async runRoomRemovedTest(page, screenshots, gameConfig, longRun)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        let forestOptions = page.locator('.scene-select option[value="'+Login.FOREST_ROOM_NAME+'"]');
        await expect(forestOptions, 'The selection and the creation selectors list the room').toHaveCount(2);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/room-removed', {roomName: Login.FOREST_ROOM_NAME});
        await expect(forestOptions, 'The removed room must leave every selector').toHaveCount(0);
        expect(await page.evaluate(
            (roomName) => window.reldens.initialGameData.roomSelection.some(room => roomName === room.name),
            Login.FOREST_ROOM_NAME
        ), 'The removed room must leave the selection data').toBe(false);
        await screenshots.capture(page, 'removed-room-selectors');
    }

    static async runRejectedJoinFeatureRoomsTest(page, screenshots, gameConfig, longRun)
    {
        let forestPlayerName = await TestCharacterRoomSelection.createForestPlayer(page, gameConfig, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/reject-room-origin', {
            roomName: Login.FOREST_ROOM_NAME
        });
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        expect(await Login.selectPlayer(page, forestPlayerName), forestPlayerName).toBe(true);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await TestCharacterRoomSelection.expectSelectionJoinError(page, Login.FOREST_ROOM_NAME, longRun);
        await page.evaluate(() => {
            window.e2eRejectedPlayerChatRoom = window.reldens.joinedRooms.chat;
        });
        await screenshots.capture(page, 'rejected-join-back-to-selector');
        await CharacterCreation.startSelectedPlayer(page, gameConfig.e2ePlayerName, longRun);
        expect(await page.evaluate(() => ({
            isPreviousChatOpen: window.e2eRejectedPlayerChatRoom.connection.isOpen,
            isChatReplaced: window.e2eRejectedPlayerChatRoom !== window.reldens.joinedRooms.chat,
            isFeaturesPlayerSelected: window.reldens.featuresRoomsPlayerId === window.reldens.playerData.id
        }))).toEqual({isPreviousChatOpen: false, isChatReplaced: true, isFeaturesPlayerSelected: true});
    }

    static async runForgedSelectedSceneTest(page, gameConfig, longRun)
    {
        let loginRooms = (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/characters/single-login-room', {})).rooms;
        expect(loginRooms.some(room => Login.FOREST_ROOM_NAME === room.name), 'Not a login room').toBe(false);
        let storedRoomId = (await CharacterCreation.fetchPlayerState(gameConfig, gameConfig.e2ePlayerName)).room_id;
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        expect(await Login.selectPlayer(page, gameConfig.e2ePlayerName)).toBe(true);
        await page.locator(TestCharacterRoomSelection.SELECTOR_SCENE_SELECT).evaluate((select, forgedRoom) => {
            select.append(new Option(forgedRoom, forgedRoom));
            select.value = forgedRoom;
        }, Login.FOREST_ROOM_NAME);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await TestCharacterRoomSelection.expectSelectionJoinError(page, Login.FOREST_ROOM_NAME, longRun);
        await expect(page.locator(Selectors.body.gameEngineStarted), 'The game must not start').toHaveCount(0);
        expect((await CharacterCreation.fetchPlayerState(gameConfig, gameConfig.e2ePlayerName)).room_id).toBe(storedRoomId);
    }

    static run()
    {
        test.describe('Character Room Selection', () => {
            test('creation in a selected registration room starts there', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterRoomSelection.runRegistrationRoomTest(page, screenshots, gameConfig, longRun);
            });
            test('creation room not in the list falls back to the initial state', async ({ page, gameConfig, longRun }) => {
                await TestCharacterRoomSelection.runUnknownCreationRoomTest(page, gameConfig, longRun);
            });
            test('scene selectors follow the last location and the login selection', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterRoomSelection.runSceneSelectorsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('selected room stays stored for the last location', async ({ page, gameConfig, longRun }) => {
                await TestCharacterRoomSelection.runStoredRoomTest(page, gameConfig, longRun);
            });
            test('single login room renders the hidden scene input', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterRoomSelection.runSingleRoomTest(page, gameConfig, e2eGroup, longRun);
            });
            test('guests and users get their own room lists', async ({ page, gameConfig, longRun }) => {
                await TestCharacterRoomSelection.runGuestRoomsTest(page, gameConfig, longRun);
            });
            test('unavailable rooms are labeled', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterRoomSelection.runUnavailableLabelsTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('removed room leaves the open scene selectors', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterRoomSelection.runRoomRemovedTest(page, screenshots, gameConfig, longRun);
            });
            test('another player after a rejected join leaves the previous feature rooms', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterRoomSelection.runRejectedJoinFeatureRoomsTest(page, screenshots, gameConfig, longRun);
            });
            test('forged selected scene outside the login rooms is not applied', async ({ page, gameConfig, longRun }) => {
                await TestCharacterRoomSelection.runForgedSelectedSceneTest(page, gameConfig, longRun);
            });
        });
    }

}

TestCharacterRoomSelection.run();
