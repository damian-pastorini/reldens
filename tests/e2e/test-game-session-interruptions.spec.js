/**
 *
 * Reldens - Test Game Session Interruptions
 *
 * Tests a game session cut while something is still pending: a message sent while the room connection is closing (the
 * socket close sets the closing state at once, the send in the same step is skipped without the connection lost modal,
 * only the room leave of the closed connection shows its server down modal), the F5 key pressed before the page
 * reload (it marks the forced disconnection, so the connection the server drops right after shows no server down modal
 * once the client handled the room leave), a scene change whose reconnect fails after the next room join (a client
 * listener of the joined room event throws, the rejected join is covered by the lifecycle spec) showing the reconnect
 * modal, and the players state handler timer of a player that joined without life (the town
 * state handler is on with a short time out): the player joined without life is blocked (its direction moves nothing
 * and leaves no movement interval, checked with a time out longer than the test), the player that stays turns active
 * once the time out ends, and the player
 * that leaves before it keeps the dead state on its removed schema, since the leave clears the timer.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { SecurityApi } = require('./helpers/security-api');
const { LoginServerApi } = require('./helpers/login-server-api');
const { MovementScenario } = require('./helpers/movement-scenario');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestGameSessionInterruptions
{

    static STATE_TIME_OUT_MS = 1000;
    static BLOCKED_TIME_OUT_MS = 60000;

    static async runClosingConnectionSendTest(page, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let closingSend = await page.evaluate((reloadModalSelector) => {
            let roomEvents = window.reldens.activeRoomEvents;
            roomEvents.room.connection.close();
            return [
                roomEvents.room.connection.transport.ws.readyState,
                roomEvents.send({act: 'e2e-closing-connection'}),
                Boolean(document.querySelector(reloadModalSelector))
            ];
        }, Selectors.reloadModal.container);
        expect(closingSend, 'The send on the closing connection is skipped without the error modal').toEqual([
            WebSocket.CLOSING,
            false,
            false
        ]);
        await expect.poll(
            async () => page.evaluate(() => window.reldens.activeRoomEvents.room.connection.transport.ws.readyState),
            {message: 'The connection ends closed', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(WebSocket.CLOSED);
        await expect(
            page.locator(Selectors.reloadModal.message),
            'Only the room leave of the closed connection shows its server down modal'
        ).toHaveText(GameTranslations.game.errors.serverDown, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runForcedDisconnectionTest(page, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await page.evaluate(() => {
            window.e2eLeftScene = false;
            window.reldens.events.on('reldens.playerLeftScene', () => {
                window.e2eLeftScene = true;
            });
        });
        await page.keyboard.press('F5');
        expect(await page.evaluate(() => window.reldens.forcedDisconnection), 'The F5 key marks the forced disconnection')
            .toBe(true);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/drop-connection', {
            roomName: Login.TOWN_ROOM_NAME,
            playerName: gameConfig.e2ePlayerName
        });
        await expect.poll(
            async () => page.evaluate(() => window.e2eLeftScene),
            {message: 'The client handled the dropped connection leave', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        await expect(page.locator(Selectors.reloadModal.container), 'The forced disconnection shows no server down modal')
            .toHaveCount(0);
    }

    static async runFailingReconnectTest(page, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await MovementScenario.walkBelowTheForestFromReturnPoint(page, gameConfig, gameConfig.e2ePlayerName, longRun);
        await page.evaluate(() => {
            window.reldens.events.on('reldens.joinedRoom', () => {
                throw new Error('E2E joined room listener failure.');
            });
        });
        await MovementScenario.tryWalkIntoTheForest(page, longRun);
        await expect(
            page.locator(Selectors.reloadModal.message),
            'The reconnect failing after the next room join shows the reconnect modal'
        ).toHaveText(GameTranslations.game.errors.reconnectClient, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async joinWithoutLife(page, gameConfig, longRun, timeOut)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/state-handler', {
            roomName: Login.TOWN_ROOM_NAME,
            enabled: true,
            timeOut
        });
        await RoomObjectsApi.setPlayerAffectedProperty(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName, 0);
        await TestGameSessionInterruptions.leaveTown(page, gameConfig);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        expect(
            await SecurityApi.request(gameConfig, 'POST', '/api/e2e/game-session/watch-player', {
                roomName: Login.TOWN_ROOM_NAME,
                playerName: gameConfig.e2ePlayerName
            }),
            'The player without life joins dead and is watched'
        ).toEqual({ok: true, inState: GameConst.STATUS.DEATH});
    }

    static async leaveTown(page, gameConfig)
    {
        await page.goto('about:blank');
        await expect.poll(
            async () => LoginServerApi.fetchPlayersInRoom(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName),
            {message: 'The player left the town', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
    }

    static async runBlockedWhileDeadTest(page, gameConfig, longRun)
    {
        let playerName = gameConfig.e2ePlayerName;
        await TestGameSessionInterruptions.joinWithoutLife(
            page,
            gameConfig,
            longRun,
            TestGameSessionInterruptions.BLOCKED_TIME_OUT_MS
        );
        let joined = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        await GameplayE2eStateApi.recordMovementMessages(gameConfig, playerName);
        await RoomMessagesRecorder.sendMessage(page, {dir: GameConst.RIGHT});
        await expect.poll(
            async () => GameplayE2eStateApi.fetchMovementMessages(gameConfig, playerName),
            {message: 'The server got the direction of the dead player', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([{dir: GameConst.RIGHT, act: ''}]);
        let blocked = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        expect(
            [
                await GameplayE2eStateApi.fetchMovementIntervals(
                    gameConfig,
                    Login.TOWN_ROOM_NAME,
                    await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})
                ),
                blocked.x,
                blocked.y
            ],
            'The player joined without life is blocked until the state handler time out ends'
        ).toEqual([[], joined.x, joined.y]);
    }

    static async runStateTimeOutTest(page, gameConfig, longRun, leavesBeforeTimeOut)
    {
        await TestGameSessionInterruptions.joinWithoutLife(
            page,
            gameConfig,
            longRun,
            TestGameSessionInterruptions.STATE_TIME_OUT_MS
        );
        let expectedPlayer = {inState: GameConst.STATUS.ACTIVE, inRoom: true};
        if(leavesBeforeTimeOut){
            await TestGameSessionInterruptions.leaveTown(page, gameConfig);
            await page.waitForTimeout(TestGameSessionInterruptions.STATE_TIME_OUT_MS * 2);
            expectedPlayer = {inState: GameConst.STATUS.DEATH, inRoom: false};
        }
        await expect.poll(
            async () => SecurityApi.request(
                gameConfig,
                'GET',
                '/api/e2e/game-session/watched-player?'+new URLSearchParams({roomName: Login.TOWN_ROOM_NAME}).toString()
            ),
            {
                message: 'The player that stays turns active after the time out, the one that left keeps its timer cleared',
                timeout: TimeConstants.SERVER_RESPONSE
            }
        ).toEqual(expectedPlayer);
    }

    static run()
    {
        test.describe('Game Session Interruptions', () => {
            test('send while the connection is closing is skipped without the error modal', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionInterruptions.runClosingConnectionSendTest(page, gameConfig, longRun);
            });
            test('the F5 key marks the forced disconnection and the dropped connection shows no server down modal', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionInterruptions.runForcedDisconnectionTest(page, gameConfig, longRun);
            });
            test('a reconnect failing after the next room join shows the reconnect modal', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionInterruptions.runFailingReconnectTest(page, gameConfig, longRun);
            });
            test('player joined without life is blocked before the state handler time out ends', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionInterruptions.runBlockedWhileDeadTest(page, gameConfig, longRun);
            });
            test('player joined without life turns active once the state handler time out ends', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionInterruptions.runStateTimeOutTest(page, gameConfig, longRun, false);
            });
            test('player that leaves before the state handler time out keeps its timer cleared', async ({ page, gameConfig, longRun }) => {
                await TestGameSessionInterruptions.runStateTimeOutTest(page, gameConfig, longRun, true);
            });
        });
    }

}

TestGameSessionInterruptions.run();
