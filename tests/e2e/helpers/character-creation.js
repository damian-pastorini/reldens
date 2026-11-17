/**
 *
 * Reldens - Character Creation
 *
 * Page actions and assertions for the players creation form: submits the form or sends the create player message
 * directly through the game room, counts the create messages the browser sends, waits for the creation error or the
 * game start, starts the game with a selected player, enters the game as a guest with a new player in the given scene
 * (returning the guest username, generated password and player name) and loads the stored players and their state by
 * name. The error texts are the ones sent by PlayerCreation.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { DirectFormSubmit } = require('./direct-form-submit');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { GameConst } = require('../../../lib/game/constants');

class CharacterCreation
{

    static CREATE_FORM = '#player-create-form';
    static CREATE_ERROR = '#player-create-form .response-error';
    static CREATE_LOADING = '#player-create-form .loading-container';
    static CLASS_SELECT = '#class-path-select';
    static CLASS_AVATAR = '#class-path-selector-box .class-path-select-avatar';
    static CREATE_SCENE_SELECT = '#player-create-form .scene-select';
    static NAME_FIELD_KEY = 'new-player-name';
    static INVALID_NAME_MESSAGE = 'Invalid player name, please choose another name.';
    static NAME_UNAVAILABLE_MESSAGE = 'The player name is not available, please choose another name.';
    static INITIAL_STATE_MESSAGE = 'There was an error with the player initial state, please contact the administrator.';
    static CREATION_ERROR_MESSAGE = 'There was an error creating your player, please try again.';
    static NOTHING_SENT_WAIT_MS = 1000;
    static GUEST_NAME_PREFIX = 'Guest';

    static createPlayerName()
    {
        return 'E2eP'+Date.now().toString(36);
    }

    static trackCreateMessages(page)
    {
        let tracked = {count: 0};
        page.on('websocket', (webSocket) => {
            webSocket.on('framesent', (frame) => {
                tracked.count += String(frame.payload).includes(CharacterCreation.NAME_FIELD_KEY) ? 1 : 0;
            });
        });
        return tracked;
    }

    static async loginToCreation(page, gameConfig, longRun, userKeySuffix = '')
    {
        await Login.loginToSelection(
            page,
            gameConfig['e2eUsername'+userKeySuffix],
            gameConfig['e2ePassword'+userKeySuffix] || gameConfig.e2ePassword,
            longRun
        );
    }

    static async submitCreateForm(page, playerName)
    {
        await page.locator(Selectors.characterSelect.newPlayerName).fill(playerName);
        await page.click(Selectors.characterSelect.createSubmit);
    }

    static async sendCreateMessage(page, formData)
    {
        await page.evaluate((createMessage) => {
            window.reldens.gameRoom.send('*', createMessage);
        }, {act: GameConst.CREATE_PLAYER, formData});
    }

    static async expectCreateError(page, message, longRun)
    {
        await expect(page.locator(CharacterCreation.CREATE_ERROR)).toHaveText(message, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await expect(page.locator(CharacterCreation.CREATE_LOADING), 'The error must hide the spinner').toBeHidden();
    }

    static async waitForGameStart(page, longRun)
    {
        await page.waitForSelector(Selectors.body.gameEngineStarted, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
    }

    static async createPlayerInRoom(page, gameConfig, longRun, playerName, roomName)
    {
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await page.locator(CharacterCreation.CREATE_SCENE_SELECT).selectOption(roomName);
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.waitForGameStart(page, longRun);
    }

    static async enterGuestInGame(page, longRun, sceneName)
    {
        await DirectFormSubmit.enterGuestToCreation(page, longRun);
        await page.locator(CharacterCreation.CREATE_SCENE_SELECT).selectOption(sceneName);
        await CharacterCreation.submitCreateForm(page, CharacterCreation.GUEST_NAME_PREFIX+Date.now());
        await CharacterCreation.waitForGameStart(page, longRun);
        return await page.evaluate(() => ({
            username: window.reldens.initialGameData.userName,
            password: window.reldens.initialGameData.guestPassword,
            playerName: window.reldens.playerData.name
        }));
    }

    static async startSelectedPlayer(page, playerName, longRun)
    {
        expect(await Login.selectPlayer(page, playerName), playerName).toBe(true);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await CharacterCreation.waitForGameStart(page, longRun);
    }

    static async loadPlayers(gameConfig, playerName)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {name: playerName});
    }

    static async fetchPlayerState(gameConfig, playerName)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'playersState', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})
        })).shift();
    }

}

module.exports.CharacterCreation = CharacterCreation;
