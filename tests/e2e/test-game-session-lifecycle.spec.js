/**
 *
 * Reldens - Test Game Session Lifecycle
 *
 * Tests a game session from the login to the logout: the state saved and restored, the logout seen by others, the page
 * reload, the dropped connection, the room closing message, the closed connection, the scene change rejected mid game,
 * the feature room join failure, the quick relogin, the dead state handler, the login records and the played time.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { MovementScenario } = require('./helpers/movement-scenario');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ChatConst } = require('../../lib/chat/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestGameSessionLifecycle
{

    static WALK_MS = 600;
    static SETTLE_MS = 1000;
    static CLOSING_SECONDS = 1;

    static async fetchTownPlayer(gameConfig)
    {
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName);
    }

    static async walkRight(page)
    {
        await Navigation.walkInDirection(page, 'ArrowRight', TestGameSessionLifecycle.WALK_MS);
        await page.waitForTimeout(TestGameSessionLifecycle.SETTLE_MS);
    }

    static async logout(page, longRun)
    {
        await page.click(Selectors.hud.logout);
        await expect(page.locator(Selectors.login.form)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
    }

    static async expectModalText(page, message, longRun)
    {
        await expect(page.locator(Selectors.reloadModal.message)).toHaveText(message, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
    }

    static async fetchUserRow(gameConfig)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername})).shift();
    }

    static async fetchStoredState(gameConfig)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'playersState', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName})
        })).shift();
    }

    static async runLogoutAndReloginTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let initialPlayer = await TestGameSessionLifecycle.fetchTownPlayer(gameConfig);
        let loweredLife = Math.floor(initialPlayer.totalLife / 2);
        await RoomObjectsApi.setPlayerAffectedProperty(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName, loweredLife);
        await TestGameSessionLifecycle.walkRight(page);
        let loggedOutPlayer = await TestGameSessionLifecycle.fetchTownPlayer(gameConfig);
        await TestGameSessionLifecycle.logout(page, longRun);
        await expect(page.locator(Selectors.reloadModal.container), 'No server down modal').toHaveCount(0);
        let storedState = await TestGameSessionLifecycle.fetchStoredState(gameConfig);
        expect([storedState.x, storedState.y]).toEqual([Math.trunc(loggedOutPlayer.x), Math.trunc(loggedOutPlayer.y)]);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let restoredPlayer = await TestGameSessionLifecycle.fetchTownPlayer(gameConfig);
        expect([restoredPlayer.x, restoredPlayer.y]).toEqual([storedState.x, storedState.y]);
        expect(restoredPlayer.life, 'The stats must be restored').toBe(loweredLife);
        await screenshots.capture(page, 'relogin-restored-state');
    }

    static async runLogoutSeenByOthersTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let playerName = gameConfig.e2ePlayerName;
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await expect.poll(async () => await secondPage.evaluate((searchedName) => {
            let scene = window.reldens.getActiveScene();
            let players = scene.player.players;
            let playerKey = Object.keys(players).find(key => searchedName === players[key].playerName);
            scene.player.currentTarget = playerKey ? {id: playerKey, type: 'player'} : false;
            return Boolean(scene.player.currentTarget);
        }, playerName), {message: 'The other client must target the player'}).toBe(true);
        await TestGameSessionLifecycle.logout(page, longRun);
        await expect.poll(async () => await secondPage.evaluate((searchedName) => {
            let scene = window.reldens.getActiveScene();
            let players = scene.player.players;
            return [
                Object.keys(players).some(key => searchedName === players[key].playerName),
                Boolean(scene.player.currentTarget)
            ];
        }, playerName), {message: 'The sprite and the target must be removed'}).toEqual([false, false]);
        await screenshots.capture(secondPage, 'logout-seen-by-others');
    }

    static async runPageReloadTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await page.reload();
        await expect(page.locator(Selectors.login.form)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
        await expect(page.locator(Selectors.reloadModal.container), 'No error modal').toHaveCount(0);
        await screenshots.capture(page, 'reload-mid-game');
    }

    static async runDroppedConnectionTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/drop-connection', {
            roomName: Login.TOWN_ROOM_NAME,
            playerName: gameConfig.e2ePlayerName
        });
        await TestGameSessionLifecycle.expectModalText(page, GameTranslations.game.errors.serverDown, longRun);
        await screenshots.capture(page, 'server-down-modal');
    }

    static async runRoomClosingTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/room-closing', {
            roomName: Login.TOWN_ROOM_NAME,
            seconds: TestGameSessionLifecycle.CLOSING_SECONDS
        });
        await TestGameSessionLifecycle.expectModalText(page, GameTranslations.game.errors.roomClosed, longRun);
        let modalPlayer = await TestGameSessionLifecycle.fetchTownPlayer(gameConfig);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(TestGameSessionLifecycle.WALK_MS);
        await page.keyboard.up('ArrowRight');
        await page.waitForTimeout(TestGameSessionLifecycle.SETTLE_MS);
        let afterKeysPlayer = await TestGameSessionLifecycle.fetchTownPlayer(gameConfig);
        expect([afterKeysPlayer.x, afterKeysPlayer.y], 'The keys must not reach the game').toEqual([
            modalPlayer.x,
            modalPlayer.y
        ]);
        await screenshots.capture(page, 'room-closed-modal');
        await page.click(Selectors.reloadModal.button);
        await expect(page.locator(Selectors.login.form)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
    }

    static async runClosedConnectionSendTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await page.evaluate(() => window.reldens.activeRoomEvents.room.connection.close());
        await expect.poll(async () => await page.evaluate(
            () => window.reldens.activeRoomEvents.room.connection.transport.ws.readyState
        )).toBe(WebSocket.CLOSED);
        await page.evaluate(() => window.reldens.activeRoomEvents.send({act: 'e2e-closed-connection'}));
        await TestGameSessionLifecycle.expectModalText(page, GameTranslations.game.errors.connectionLost, longRun);
        await screenshots.capture(page, 'connection-lost-modal');
    }

    static async runRejectedSceneChangeTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await MovementScenario.walkBelowTheForestFromReturnPoint(page, gameConfig, gameConfig.e2ePlayerName, longRun);
        await SecurityApi.banUser(gameConfig, gameConfig.e2eUsername);
        await MovementScenario.tryWalkIntoTheForest(page, longRun);
        await TestGameSessionLifecycle.expectModalText(page, GameTranslations.game.errors.reconnectClient, longRun);
        expect(await Navigation.getCurrentRoomName(page), 'The scene must not change').toBe(Login.TOWN_ROOM_NAME);
        await screenshots.capture(page, 'scene-change-rejected');
    }

    static async runFeatureRoomFailureTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/reject-room-origin', {
            roomName: ChatConst.CHAT_GLOBAL
        });
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await TestGameSessionLifecycle.expectModalText(
            page,
            GameTranslations.game.errors.joiningFeatureRoom.replace('%joinRoomName', ChatConst.CHAT_GLOBAL),
            longRun
        );
        await expect(page.locator(Selectors.body.gameEngineStarted), 'The game must not start').toHaveCount(0);
        await screenshots.capture(page, 'feature-room-join-failure');
    }

    static async runQuickReloginTest(page, secondPage, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await TestGameSessionLifecycle.walkRight(page);
        let closedPlayer = await TestGameSessionLifecycle.fetchTownPlayer(gameConfig);
        await page.goto('about:blank');
        await Login.loginRootPlayer(secondPage, gameConfig, longRun);
        let reloggedPlayer = await TestGameSessionLifecycle.fetchTownPlayer(gameConfig);
        expect([reloggedPlayer.x, reloggedPlayer.y], 'The saved position must be loaded').toEqual([
            Math.trunc(closedPlayer.x),
            Math.trunc(closedPlayer.y)
        ]);
    }

    static async runStateHandlerTest(page, gameConfig, longRun, isEnabled)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/state-handler', {
            roomName: Login.TOWN_ROOM_NAME,
            enabled: isEnabled
        });
        await RoomObjectsApi.setPlayerAffectedProperty(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName, 0);
        await TestGameSessionLifecycle.logout(page, longRun);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        return (await TestGameSessionLifecycle.fetchTownPlayer(gameConfig)).inState;
    }

    static async runLoginRecordsTest(page, screenshots, gameConfig, longRun)
    {
        let storedUser = await TestGameSessionLifecycle.fetchUserRow(gameConfig);
        let loginsBefore = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLogin', {user_id: storedUser.id})).length;
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await expect(page.locator(GameConst.SELECTORS.FORMS_CONTAINER)).toHaveCount(0);
        await expect(page.locator('body')).toHaveClass(new RegExp(GameConst.CLASSES.GAME_STARTED));
        await expect(page.locator('body')).not.toHaveClass(new RegExp(GameConst.CLASSES.GAME_ERROR));
        expect(await page.evaluate(() => window.reldens.initialGameData.guestPassword), 'No guest password').toBe('');
        let logins = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLogin', {user_id: storedUser.id});
        expect(logins.length).toBe(loginsBefore + 1);
        expect((await TestGameSessionLifecycle.fetchUserRow(gameConfig)).login_count).toBe(Number(storedUser.login_count) + 1);
        await screenshots.capture(page, 'login-records');
    }

    static async runLastLoginFailureTest(page, gameConfig, longRun)
    {
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/fail-last-login', {});
        expect(await Login.submitLoginExpectingError(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun)).toBe(
            GameConst.JOIN_GAME_ERROR_MESSAGE
        );
    }

    static async runMissingGameConfigTest(page, gameConfig, longRun)
    {
        let pageErrors = [];
        page.on('pageerror', pageError => pageErrors.push(pageError.message));
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/strip-game-config', {});
        await Login.submitLogin(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await expect.poll(() => pageErrors.join(' '), {message: 'The client must fail on the missing config'}).toContain(
            'Missing game configuration.'
        );
        await expect(page.locator(Selectors.characterSelect.container+':not(.hidden)')).toHaveCount(0);
    }

    static async runPlayedTimeTest(page, gameConfig, longRun)
    {
        let storedUser = await TestGameSessionLifecycle.fetchUserRow(gameConfig);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await page.waitForTimeout(TestGameSessionLifecycle.SETTLE_MS * 2);
        await TestGameSessionLifecycle.logout(page, longRun);
        await expect.poll(
            async () => Number((await TestGameSessionLifecycle.fetchUserRow(gameConfig)).played_time),
            {message: 'The played time must grow'}
        ).toBeGreaterThan(Number(storedUser.played_time));
        await expect.poll(async () => Boolean(
            (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLogin', {user_id: storedUser.id})).reduce(
                (latest, login) => login.id > latest.id ? login : latest
            ).logout_date
        ), {message: 'The logout date must be stored'}).toBe(true);
    }

    static run()
    {
        test.describe('Game Session Lifecycle', () => {
            test('logout saves the state and the next login restores it', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runLogoutAndReloginTest(page, screenshots, gameConfig, longRun);
            });
            test('logout removes the sprite and the target for other clients', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runLogoutSeenByOthersTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('page reload returns to the login without the error modal', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runPageReloadTest(page, screenshots, gameConfig, longRun);
            });
            test('dropped connection shows the server down modal', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runDroppedConnectionTest(page, screenshots, gameConfig, longRun);
            });
            test('room closing message blocks the keys and reloads to the login', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runRoomClosingTest(page, screenshots, gameConfig, longRun);
            });
            test('send on a closed connection shows the connection lost modal', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runClosedConnectionSendTest(page, screenshots, gameConfig, longRun);
            });
            test('scene change rejected mid game shows the reconnect modal', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runRejectedSceneChangeTest(page, screenshots, gameConfig, longRun);
            });
            test('feature room join failure shows the modal', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runFeatureRoomFailureTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('closing the page and logging in again loads the saved position', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runQuickReloginTest(page, secondPage, gameConfig, longRun);
            });
            test('state handler on rejoins a player without life dead', async ({ page, gameConfig, longRun }) => {
                        expect(await TestGameSessionLifecycle.runStateHandlerTest(page, gameConfig, longRun, true)).toBe(
                    GameConst.STATUS.DEATH
                );
            });
            test('state handler off rejoins a player without life active', async ({ page, gameConfig, longRun }) => {
                        expect(await TestGameSessionLifecycle.runStateHandlerTest(page, gameConfig, longRun, false)).toBe(
                    GameConst.STATUS.ACTIVE
                );
            });
            test('login stores the login records and the game started state', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runLoginRecordsTest(page, screenshots, gameConfig, longRun);
            });
            test('last login update failure rejects the join', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runLastLoginFailureTest(page, gameConfig, longRun);
            });
            test('initial game data without the game config fails on the client', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runMissingGameConfigTest(page, gameConfig, longRun);
            });
            test('logout stores the played time and the logout date', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionLifecycle.runPlayedTimeTest(page, gameConfig, longRun);
            });
        });
    }

}

TestGameSessionLifecycle.run();
