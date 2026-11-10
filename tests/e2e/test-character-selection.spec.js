/**
 *
 * Reldens - Test Character Selection
 *
 * Tests the players selection: the new character listed and seen by others, the selection of another character, the
 * forged player and scene joins, the player without state, the user without players and the single player modes.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CharacterCreation } = require('./helpers/character-creation');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { Login } = require('./helpers/login');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCharacterSelection
{

    static PLAYER_SELECT = 'select#player-select-element';
    static PLAYER_SELECT_BOX = '.player-select-box';
    static SELECTOR_FORM = '#player-selector-form';

    static async joinRoomWithPlayer(page, roomName, selectedPlayer)
    {
        return await page.evaluate(async (joinData) => {
            return {
                joined: Boolean(await window.reldens.gameClient.joinOrCreate(
                    joinData.roomName,
                    Object.assign({}, window.reldens.userData, {selectedPlayer: joinData.selectedPlayer})
                )),
                error: window.reldens.gameClient.lastErrorMessage
            };
        }, {roomName, selectedPlayer});
    }

    static async runNewCharacterTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await CharacterCreation.createPlayerInRoom(page, gameConfig, longRun, playerName, Login.TOWN_ROOM_NAME);
        expect(await page.evaluate(() => window.reldens.playerData.name)).toBe(playerName);
        await expect.poll(async () => await secondPage.evaluate((searchedName) => {
            let players = window.reldens.getActiveScene().player.players;
            return Object.keys(players).some(playerKey => searchedName === players[playerKey].playerName);
        }, playerName), {message: 'Another client must see the new character'}).toBe(true);
        await screenshots.capture(secondPage, 'new-character-seen-by-others');
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await expect(page.locator(Selectors.characterSelect.option).filter({hasText: playerName+' - LvL 1 - '})).toHaveCount(1);
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName});
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'playersStats', {player_id: playerId})).length).toBe(
            (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'stats', {})).length
        );
    }

    static async runSelectAnotherCharacterTest(page, screenshots, gameConfig, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.waitForGameStart(page, longRun);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await CharacterCreation.startSelectedPlayer(page, playerName, longRun);
        expect(await page.evaluate(() => window.reldens.playerData.name)).toBe(playerName);
        await screenshots.capture(page, 'another-character-selected');
    }

    static async runOtherUserPlayerTest(page, gameConfig, longRun)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        let otherPlayerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName2});
        let storedPlayers = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {});
        let missingPlayerId = Math.max(...storedPlayers.map(player => player.id)) + 1;
        for(let forgedPlayerId of [otherPlayerId, missingPlayerId]){
            expect(
                await TestCharacterSelection.joinRoomWithPlayer(page, Login.TOWN_ROOM_NAME, forgedPlayerId),
                'Forged player id '+forgedPlayerId
            ).toEqual({joined: false, error: GameConst.INVALID_LOGIN_MESSAGE});
        }
    }

    static async runPlayerWithoutStateTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let playerName = CharacterCreation.createPlayerName();
        let userId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername});
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'players', {user_id: userId, name: playerName});
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        expect(await Login.selectPlayer(page, playerName), playerName).toBe(true);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await expect(page.locator(Selectors.reloadModal.message)).toHaveText(
            GameTranslations.game.errors.missingPlayerData,
            {timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)}
        );
        await screenshots.capture(page, 'player-without-state');
    }

    static async runNoPlayersTest(page, screenshots, longRun)
    {
        let username = DirectFormSubmit.createUniqueName();
        await DirectFormSubmit.submit(
            page,
            DirectFormSubmit.createRegistration(username, username+'@yourgame.com', DirectFormSubmit.VALID_PASSWORD),
            true
        );
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The new account');
        await Login.loginToSelection(page, username, DirectFormSubmit.VALID_PASSWORD, longRun);
        await expect(page.locator(TestCharacterSelection.SELECTOR_FORM)).toBeHidden();
        await expect(page.locator(CharacterCreation.CREATE_FORM)).toBeVisible();
        await screenshots.capture(page, 'no-players-creation-only');
    }

    static async runSinglePlayerModesTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let userId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername3});
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {user_id: userId})).length, 'One player').toBe(1);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/players/multiplePlayers/enabled', false);
        await CharacterCreation.loginToCreation(page, gameConfig, longRun, '3');
        await expect(page.locator(TestCharacterSelection.PLAYER_SELECT)).toHaveCount(0);
        await expect(page.locator(TestCharacterSelection.PLAYER_SELECT_BOX)).toContainText(gameConfig.e2ePlayerName3);
        await screenshots.capture(page, 'single-player-form');
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/rooms/selection/allowOnLogin', false);
        await Login.submitLogin(page, gameConfig.e2eUsername3, gameConfig.e2ePassword, longRun);
        await CharacterCreation.waitForGameStart(page, longRun);
        expect(await page.evaluate(() => window.reldens.playerData.name)).toBe(gameConfig.e2ePlayerName3);
    }

    static async runSceneMismatchTest(page, gameConfig, longRun)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName});
        expect(await TestCharacterSelection.joinRoomWithPlayer(page, Login.FOREST_ROOM_NAME, playerId)).toEqual({
            joined: false,
            error: GameConst.JOIN_GAME_ERROR_MESSAGE
        });
    }

    static run()
    {
        test.describe('Character Selection', () => {
            test('new character is named, seen by others and listed with its stats', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestCharacterSelection.runNewCharacterTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('selecting another character starts with that character', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCharacterSelection.runSelectAnotherCharacterTest(page, screenshots, gameConfig, longRun);
            });
            test('player of another user or a missing player is rejected', async ({ page, gameConfig, longRun }) => {
                await TestCharacterSelection.runOtherUserPlayerTest(page, gameConfig, longRun);
            });
            test('player without state shows the missing player data modal', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterSelection.runPlayerWithoutStateTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('user without players gets only the creation form', async ({ page, screenshots, longRun }) => {
                await TestCharacterSelection.runNoPlayersTest(page, screenshots, longRun);
            });
            test('single player modes show the single form or start the game', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCharacterSelection.runSinglePlayerModesTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('scene join for another scene than the state is rejected', async ({ page, gameConfig, longRun }) => {
                await TestCharacterSelection.runSceneMismatchTest(page, gameConfig, longRun);
            });
        });
    }

}

TestCharacterSelection.run();
