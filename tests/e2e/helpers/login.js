/**
 *
 * Reldens - Login Helper
 *
 * Provides the sample town and forest rooms names (the forest levels from the first to the sixth one) and the page
 * actions for logging in, selecting a character, and waiting for the game to start (the start click runs the game
 * engine creation in its submit handler, so it is bound by the game start time, not the one second action time; the first scene preload creates
 * the UI scene and its HUD after the game engine starts, so the HUD buttons are checked once the UI scene runs). Every extra client
 * page opened by openClientPage() keeps its browser context, closed by the page fixture after each test (even a failed
 * one), so no extra player stays connected into the next test reset. A timed login returns its start and end times,
 * so the latest stored login date of the user is checked against them (stored in the server local time, at most one
 * second before the start since the column keeps whole seconds).
 *
 */

const { expect } = require('@playwright/test');
const { Selectors } = require('../selectors');
const { TimeConstants } = require('./time-constants');
const { Navigation } = require('./navigation');
const { SecurityApi } = require('./security-api');
const { RoomObjectsApi } = require('./room-objects-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { sc } = require('@reldens/utils');

class Login
{
    static STORED_SECOND_MS = 1000;
    static TOWN_ROOM_NAME = 'reldens-new-age-town';
    static FOREST_ROOM_NAME = 'reldens-forest-level-1';
    static FOREST_LEVELS = [
        Login.FOREST_ROOM_NAME,
        'reldens-forest-level-2',
        'reldens-forest-level-3',
        'reldens-forest-level-4',
        'reldens-forest-level-5',
        'reldens-forest-level-6'
    ];
    static FOREST_TRANSITION_X = 608;
    static FOREST_TRANSITION_Y = 16;
    static openedClientContexts = [];

    static async selectPlayer(page, playerName)
    {
        let select = page.locator(Selectors.characterSelect.select);
        await expect(select).toBeVisible();
        let options = await select.locator('option').all();
        for(let option of options) {
            let text = await option.textContent();
            let trimmed = text ? text.trim() : '';
            if(trimmed === playerName || trimmed.startsWith(playerName+' ') || trimmed.startsWith(playerName+'-')) {
                let value = await option.getAttribute('value');
                await select.selectOption(value);
                return true;
            }
        }
        return false;
    }

    static async loginToSelection(page, username, password, longRun)
    {
        await Login.submitLogin(page, username, password, longRun);
        await page.waitForSelector(
            Selectors.characterSelect.container+':not(.hidden)',
            { timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun) }
        );
        await page.waitForTimeout(TimeConstants.pauseMs(longRun));
    }

    static async submitLogin(page, username, password, longRun)
    {
        let typeDelay = TimeConstants.typeDelay(longRun);
        let pauseMs = TimeConstants.pauseMs(longRun);
        let loadTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let loaded = false;
        for(let attempt = 1; 3 >= attempt; attempt++) {
            await page.goto('/');
            loaded = await page.waitForSelector(
                Selectors.login.form,
                { state: 'visible', timeout: loadTimeout }
            ).then(() => true).catch(() => false);
            if(loaded) {
                break;
            }
            await page.waitForTimeout(3000);
        }
        expect(loaded, 'Login form not visible after 3 page loads').toBeTruthy();
        await page.locator(Selectors.login.username).click();
        await page.locator(Selectors.login.username).pressSequentially(username, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.locator(Selectors.login.password).click();
        await page.locator(Selectors.login.password).pressSequentially(password, { delay: typeDelay });
        await page.waitForTimeout(pauseMs);
        await page.hover(Selectors.login.submit);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.login.submit);
    }

    static async submitLoginExpectingError(page, username, password, longRun)
    {
        await Login.submitLogin(page, username, password, longRun);
        let errorLocator = page.locator(Selectors.login.error);
        await expect(errorLocator).not.toBeEmpty(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        await expect(page.locator(Selectors.characterSelect.container+':not(.hidden)')).toHaveCount(0);
        return (await errorLocator.textContent()).trim();
    }

    static async selectScene(page, sceneName)
    {
        let sceneSelect = page.locator(Selectors.characterSelect.sceneSelect);
        let count = await sceneSelect.count();
        if(0 === count) {
            return false;
        }
        await sceneSelect.selectOption(sceneName);
        return true;
    }

    static async loginAndStartGame(page, username, password, playerName, longRun, skipUiSelectors = false, scene = null)
    {
        let pauseMs = TimeConstants.pauseMs(longRun);
        await Login.loginToSelection(page, username, password, longRun);
        if(playerName) {
            let selected = await Login.selectPlayer(page, playerName);
            if(!selected) {
                let available = await page.locator(Selectors.characterSelect.option).allTextContents();
                expect(selected, 'Player "'+playerName+'" not found. Available: '+available.join(', ')).toBeTruthy();
            }
        }
        if(scene) {
            await Login.selectScene(page, scene);
        }
        await page.waitForTimeout(pauseMs);
        await page.hover(Selectors.characterSelect.selectorSubmit);
        await page.waitForTimeout(pauseMs);
        let gameTimeout = TimeConstants.forLongRun(TimeConstants.GAME_START, longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        let gameStartedPromise = page.waitForSelector(Selectors.body.gameEngineStarted, { timeout: gameTimeout });
        let dialogHandler = async (dialog) => {
            await dialog.dismiss();
        };
        page.on('dialog', dialogHandler);
        await page.click(Selectors.characterSelect.selectorSubmit, {timeout: gameTimeout});
        await gameStartedPromise;
        page.off('dialog', dialogHandler);
        if(skipUiSelectors){
            return;
        }
        await page.waitForFunction(
            () => Boolean(window.reldens.gameEngine.uiScene?.sys?.isActive()),
            null,
            {timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)}
        );
        let uiSelectors = [
            Selectors.hud.chatOpen,
            Selectors.hud.logout,
            Selectors.hud.up,
            Selectors.hud.settingsOpen,
            Selectors.hud.playerStatsOpen,
            Selectors.hud.fullScreen,
            Selectors.hud.inventoryOpen,
            Selectors.hud.equipmentOpen,
            Selectors.hud.minimapOpen
        ];
        for(let selector of uiSelectors) {
            await page.waitForSelector(selector, { state: 'visible', timeout: uiTimeout })
                .catch((error) => {
                    expect(false, 'UI selector failed ['+selector+']: '+error.message).toBeTruthy();
                });
        }
    }

    static async loginOnOpenPage(target, username, password, playerName, longRun)
    {
        await target.locator(Selectors.login.username).fill(username, {
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
        await target.locator(Selectors.login.password).fill(password);
        await target.click(Selectors.login.submit);
        await target.waitForSelector(Selectors.characterSelect.container+':not(.hidden)', {
            timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)
        });
        expect(await Login.selectPlayer(target, playerName), playerName).toBe(true);
        await target.click(Selectors.characterSelect.selectorSubmit, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await target.waitForSelector(Selectors.body.gameEngineStarted, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
    }

    static async startConfigPlayer(page, gameConfig, longRun, sceneName = null, skipUiSelectors = false)
    {
        await Login.loginAndStartGame(
            page,
            gameConfig.e2eUsername,
            gameConfig.e2ePassword,
            gameConfig.e2ePlayerName,
            longRun,
            skipUiSelectors,
            sceneName
        );
    }

    static fetchSecondPlayerConfig(gameConfig)
    {
        return Object.assign({}, gameConfig, {
            e2eUsername: gameConfig.e2eUsername2,
            e2ePassword: gameConfig.e2ePassword2 || gameConfig.e2ePassword,
            e2ePlayerName: gameConfig.e2ePlayerName2
        });
    }

    static async openClientPage(page, gameConfig, contextOptions = {})
    {
        let client = {
            clientContext: await page.context().browser().newContext(
                Object.assign({baseURL: SecurityApi.baseUrl(gameConfig)}, contextOptions)
            )
        };
        client.clientPage = await client.clientContext.newPage();
        Login.openedClientContexts.push(client.clientContext);
        return client;
    }

    static async startThirdPlayer(context, roomName)
    {
        let thirdClient = await Login.openClientPage(context.page, context.gameConfig);
        await Login.loginAndStartGame(
            thirdClient.clientPage,
            context.gameConfig.e2eUsername3,
            context.gameConfig.e2ePassword3 || context.gameConfig.e2ePassword,
            context.gameConfig.e2ePlayerName3,
            context.longRun,
            false,
            roomName
        );
        return thirdClient;
    }

    static async closeClientPages()
    {
        for(let clientContext of Login.openedClientContexts){
            await clientContext.close();
        }
        Login.openedClientContexts = [];
    }

    static async loginRootPlayerTimed(page, gameConfig, longRun)
    {
        let startedMs = Date.now();
        await Login.loginRootPlayer(page, gameConfig, longRun);
        return {startedMs, endedMs: Date.now()};
    }

    static async expectLatestLoginStoredIn(gameConfig, userId, loginWindow)
    {
        let logins = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLogin', {user_id: userId});
        let storedLoginMs = new Date(logins.reduce((latest, login) => login.id > latest.id ? login : latest).login_date).getTime();
        expect(
            [loginWindow.startedMs - Login.STORED_SECOND_MS <= storedLoginMs, storedLoginMs <= loginWindow.endedMs],
            'The login date is stored in the server local time, at the login moment: '+new Date(storedLoginMs).toString()
        ).toEqual([true, true]);
    }

    static async loginRootPlayer(page, gameConfig, longRun, userKeySuffix = '', skipUiSelectors = false, sceneName = null)
    {
        let username = gameConfig['e2eUsername'+userKeySuffix] || 'root'+userKeySuffix;
        let password = gameConfig['e2ePassword'+userKeySuffix] || 'root';
        let playerName = gameConfig['e2ePlayerName'+userKeySuffix] || 'ImRoot'+userKeySuffix;
        await Login.loginAndStartGame(page, username, password, playerName, longRun, skipUiSelectors, sceneName);
    }

    static async loginAndEnterForest(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun, false, Login.FOREST_ROOM_NAME);
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let navTimeout = TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun);
        let inForest = await Navigation.ensureInRoom(
            page,
            Login.FOREST_ROOM_NAME,
            Login.FOREST_TRANSITION_X,
            Login.FOREST_TRANSITION_Y,
            navTimeout
        );
        expect(inForest, 'Player must reach '+Login.FOREST_ROOM_NAME).toBeTruthy();
        return { pauseMs, sceneTimeout, navTimeout };
    }

    static async moveThroughChangePoint(page, gameConfig, roomName, nextRoomName, playerName = gameConfig.e2ePlayerName)
    {
        await RoomMessagesRecorder.startSceneChangeRecording(page);
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(page, gameConfig, roomName, nextRoomName);
        expect(placed.position, playerName+' is placed on the change point to '+nextRoomName+': '+placed.error).toBeTruthy();
        await expect.poll(
            async () => nextRoomName === await Navigation.getCurrentRoomName(page) ? nextRoomName : sc.toJsonString({
                client: await page.evaluate(() => ({
                    roomName: window.reldens.activeRoomEvents?.roomName,
                    isChangingScene: Boolean(window.reldens.isChangingScene),
                    isGameOver: Boolean(window.reldens.gameOver),
                    modalText: document.querySelector('.reload-modal-message')?.textContent || '',
                    sceneChangeMessages: window.e2eSceneChangeMessages || []
                })),
                server: await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, playerName)
            }),
            {
                message: 'The player reaches '+nextRoomName+' (else the client state and its server state in '+roomName+')',
                timeout: TimeConstants.ROOM_TRANSITION
            }
        ).toBe(nextRoomName);
    }
}

module.exports.Login = Login;
