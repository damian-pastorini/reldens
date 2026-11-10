/**
 *
 * Reldens - Test Authentication Double Login
 *
 * Tests the same account used from more than one tab: the first session in another scene or still on the selection,
 * the position and stats handed to the second session, the sprites seen by a third client, the connections and active
 * sessions left behind, the failed state save and the tabs closed on the selection or in the game. The server side
 * values come from the e2e state endpoints and the stored rows.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Navigation } = require('./helpers/navigation');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthenticationDoubleLogin
{

    static SESSION_ENDED_MESSAGE = 'Your session ended, please login again.';
    static NOTHING_CHANGED_WAIT_MS = 1000;
    static WALK_MS = 600;

    static async expectSessionEnded(sessionPage, longRun)
    {
        await expect(sessionPage.locator(Selectors.reloadModal.message)).toHaveText(
            TestAuthenticationDoubleLogin.SESSION_ENDED_MESSAGE,
            {timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)}
        );
    }

    static async startDoubleLogin(page, secondPage, gameConfig, longRun)
    {
        await Login.startConfigPlayer(page, gameConfig, longRun);
        await Login.startConfigPlayer(secondPage, gameConfig, longRun);
        await TestAuthenticationDoubleLogin.expectSessionEnded(page, longRun);
    }

    static async fetchSpritesCount(observerPage, playerName)
    {
        return await observerPage.evaluate((searchedName) => {
            let players = window.reldens.getActiveScene().player.players;
            return Object.keys(players).filter(playerKey => searchedName === players[playerKey].playerName).length;
        }, playerName);
    }

    static async fetchTownPlayer(gameConfig)
    {
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName);
    }

    static async walkAndWaitForMove(sessionPage, gameConfig, playerBefore)
    {
        await Navigation.walkInDirection(sessionPage, 'ArrowRight', TestAuthenticationDoubleLogin.WALK_MS);
        await sessionPage.waitForTimeout(TestAuthenticationDoubleLogin.NOTHING_CHANGED_WAIT_MS);
        expect((await TestAuthenticationDoubleLogin.fetchTownPlayer(gameConfig)).x, 'The player must move').not.toBe(playerBefore.x);
    }

    static async runDifferentScenesTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        await Login.startConfigPlayer(secondPage, gameConfig, longRun, Login.TOWN_ROOM_NAME);
        await TestAuthenticationDoubleLogin.expectSessionEnded(page, longRun);
        expect(await Navigation.getCurrentRoomName(secondPage)).toBe(Login.TOWN_ROOM_NAME);
        await expect.poll(async () => await LoginServerApi.fetchPlayersInRoom(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName
        ), {message: 'The player must leave the first scene'}).toBe(0);
        await screenshots.capture(secondPage, 'double-login-different-scenes');
    }

    static async runFirstOnSelectionTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await Login.startConfigPlayer(secondPage, gameConfig, longRun);
        await page.waitForTimeout(TestAuthenticationDoubleLogin.NOTHING_CHANGED_WAIT_MS);
        await expect(page.locator(Selectors.reloadModal.container), 'The selection is not disconnected').toBeHidden();
        expect(await Login.selectPlayer(page, gameConfig.e2ePlayerName)).toBe(true);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await page.waitForSelector(Selectors.body.gameEngineStarted, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await screenshots.capture(page, 'double-login-first-on-selection');
    }

    static async runStateHandedOverTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.startConfigPlayer(page, gameConfig, longRun);
        let initialPlayer = await TestAuthenticationDoubleLogin.fetchTownPlayer(gameConfig);
        await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            gameConfig.e2ePlayerName,
            Math.floor(initialPlayer.totalLife / 2)
        );
        await TestAuthenticationDoubleLogin.walkAndWaitForMove(page, gameConfig, initialPlayer);
        let firstSessionPlayer = await TestAuthenticationDoubleLogin.fetchTownPlayer(gameConfig);
        await Login.startConfigPlayer(secondPage, gameConfig, longRun);
        await TestAuthenticationDoubleLogin.expectSessionEnded(page, longRun);
        let secondSessionPlayer = await TestAuthenticationDoubleLogin.fetchTownPlayer(gameConfig);
        expect(secondSessionPlayer.x).toBe(firstSessionPlayer.x);
        expect(secondSessionPlayer.y).toBe(firstSessionPlayer.y);
        expect(secondSessionPlayer.stats).toEqual(firstSessionPlayer.stats);
        await screenshots.capture(secondPage, 'double-login-state-handed-over');
    }

    static async runThirdClientSpritesTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let thirdClient = await Login.openClientPage(page, gameConfig);
        let thirdPage = thirdClient.clientPage;
        let playerName = gameConfig.e2ePlayerName;
        await Login.loginRootPlayer(page, gameConfig, longRun, '2');
        await Login.startConfigPlayer(secondPage, gameConfig, longRun);
        await expect.poll(async () => await TestAuthenticationDoubleLogin.fetchSpritesCount(page, playerName)).toBe(1);
        await Login.startConfigPlayer(thirdPage, gameConfig, longRun);
        await TestAuthenticationDoubleLogin.expectSessionEnded(secondPage, longRun);
        await page.waitForTimeout(TestAuthenticationDoubleLogin.NOTHING_CHANGED_WAIT_MS);
        expect(await TestAuthenticationDoubleLogin.fetchSpritesCount(page, playerName), 'One sprite').toBe(1);
        await screenshots.capture(page, 'double-login-third-client');
        await thirdClient.clientContext.close();
    }

    static async runSecondSessionPlaysTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await TestAuthenticationDoubleLogin.startDoubleLogin(page, secondPage, gameConfig, longRun);
        await TestAuthenticationDoubleLogin.walkAndWaitForMove(
            secondPage,
            gameConfig,
            await TestAuthenticationDoubleLogin.fetchTownPlayer(gameConfig)
        );
        let testMessage = 'e2e-double-login-'+Date.now();
        await secondPage.click(Selectors.hud.chatOpen);
        await secondPage.locator(Selectors.chat.input).fill(testMessage);
        await secondPage.click(Selectors.chat.send);
        await expect(secondPage.locator(Selectors.chat.tabContentGeneral)).toContainText(testMessage, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await screenshots.capture(secondPage, 'double-login-second-session-plays');
    }

    static async runSecondOnFormTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.startConfigPlayer(page, gameConfig, longRun);
        await secondPage.goto('/');
        await secondPage.waitForSelector(Selectors.login.form, {state: 'visible'});
        await page.waitForTimeout(TestAuthenticationDoubleLogin.NOTHING_CHANGED_WAIT_MS);
        await expect(page.locator(Selectors.reloadModal.container), 'Opening the form changes nothing').toBeHidden();
        await Login.startConfigPlayer(secondPage, gameConfig, longRun);
        await TestAuthenticationDoubleLogin.expectSessionEnded(page, longRun);
        await screenshots.capture(page, 'double-login-second-on-form');
    }

    static async runStateSaveFailureTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.startConfigPlayer(page, gameConfig, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/break-player-state-save', {
            roomName: Login.TOWN_ROOM_NAME,
            playerName: gameConfig.e2ePlayerName
        });
        await Login.startConfigPlayer(secondPage, gameConfig, longRun);
        expect(await LoginServerApi.fetchPlayersInRoom(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            gameConfig.e2ePlayerName
        ), 'The failed save must keep the first player').toBe(2);
        await screenshots.capture(secondPage, 'double-login-state-save-failure');
    }

    static async runSimultaneousUsersTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Promise.all([
            Login.loginRootPlayer(page, gameConfig, longRun),
            Login.loginRootPlayer(secondPage, gameConfig, longRun, '2')
        ]);
        for(let session of [
            {sessionPage: page, playerName: gameConfig.e2ePlayerName},
            {sessionPage: secondPage, playerName: gameConfig.e2ePlayerName2}
        ]){
                expect(await session.sessionPage.evaluate(() => window.reldens.playerData.name)).toBe(session.playerName);
        }
        await screenshots.capture(page, 'simultaneous-users-own-player');
    }

    static async runSelectionTabClosedTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        expect(await LoginServerApi.fetchActiveSessionsCount(gameConfig, gameConfig.e2eUsername)).toBe(1);
        await page.goto('about:blank');
        await expect.poll(
            async () => await LoginServerApi.fetchActiveSessionsCount(gameConfig, gameConfig.e2eUsername),
            {message: 'The closed tab must leave no active entries'}
        ).toBe(0);
        await Login.startConfigPlayer(secondPage, gameConfig, longRun);
        await screenshots.capture(secondPage, 'selection-tab-closed-next-login');
    }

    static async runGameTabClosedTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let playerName = gameConfig.e2ePlayerName;
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await Login.startConfigPlayer(page, gameConfig, longRun);
        await expect.poll(async () => await TestAuthenticationDoubleLogin.fetchSpritesCount(secondPage, playerName)).toBe(1);
        await TestAuthenticationDoubleLogin.walkAndWaitForMove(
            page,
            gameConfig,
            await TestAuthenticationDoubleLogin.fetchTownPlayer(gameConfig)
        );
        let lastPosition = await TestAuthenticationDoubleLogin.fetchTownPlayer(gameConfig);
        await page.goto('about:blank');
        await expect.poll(async () => await TestAuthenticationDoubleLogin.fetchSpritesCount(secondPage, playerName)).toBe(0);
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName});
        let storedState = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'playersState', {player_id: playerId})).shift();
        expect(storedState.x).toBe(Math.trunc(lastPosition.x));
        expect(storedState.y).toBe(Math.trunc(lastPosition.y));
        await screenshots.capture(secondPage, 'game-tab-closed-player-left');
    }

    static run()
    {
        test.describe('Authentication Double Login', () => {
            test('first session in another scene is removed from it', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runDifferentScenesTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('first session on the selection is not disconnected', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runFirstOnSelectionTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('second session loads the first session state', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runStateHandedOverTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('third client sees one sprite of the player', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runThirdClientSpritesTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('second session moves and uses the chat', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runSecondSessionPlaysTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('second tab on the login form leaves the first untouched', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runSecondOnFormTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('failed state save keeps the first player in the room', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runStateSaveFailureTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('two users logging in at once reach their own player', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runSimultaneousUsersTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('closing the tab on the selection leaves no active entries', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runSelectionTabClosedTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('closing the tab in game saves and removes the player', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationDoubleLogin.runGameTabClosedTest(page, secondPage, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAuthenticationDoubleLogin.run();
