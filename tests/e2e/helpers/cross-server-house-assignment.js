/**
 *
 * Reldens - Cross Server House Assignment
 *
 * The two servers setup of the cross server specs: the second house is stored with the server-2 address and the town
 * with the server-1 address, and the stored rooms are reloaded on both servers like a restart (the room data, the
 * rooms servers addresses sent to the clients and the servers the disconnect requests go to), all restored by the
 * group reset of server-1 and then of server-2; the users kept logged on the server they leave
 * (server/players/disconnectUsersOnServerChange off on both servers, restored by the same reset). It also stores a player in the second house and logs it in from the
 * server-1 page as a house observer, walks the player from the town through a change point, logs
 * the player and a town observer in, reads the arrival in
 * the second house from the town, logs the player in the town with its chat recorded and the server-1 blocking on
 * (server-1 then asks server-2 for its status before a move into the second house), checks a move from the town placed on a change point is refused with the reconnect
 * error modal and the player does not enter the next room, and reads, after a quiet time, whether the client shows the
 * session ended modal and the server-2 snapshot of a player that arrived in the second house.
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { E2eServerInstances } = require('./e2e-server-instances');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { ChangePointsSteps } = require('./change-points-steps');
const { SceneSpritesRecorder } = require('./scene-sprites-recorder');
const { SecurityApi } = require('./security-api');
const { Login } = require('./login');
const { Navigation } = require('./navigation');
const { TimeConstants } = require('./time-constants');
const { RoomObjectsApi } = require('./room-objects-api');
const { ChatSteps } = require('./chat-steps');
const { LoginServerApi } = require('./login-server-api');
const { Selectors } = require('../selectors');
const GameTranslations = require('../../../lib/game/client/snippets/en_US');

class CrossServerHouseAssignment
{

    static SECOND_HOUSE = 'reldens-house-2';
    static SECOND_SERVER = 'server-2';
    static QUIET_MS = 1500;
    static READ_SESSION_ID = () => window.reldens.activeRoomEvents.room.sessionId;

    static async assignHouseToSecondServer(context)
    {
        return await CrossServerHouseAssignment.assignRoomsServersUrls(context, {
            [CrossServerHouseAssignment.SECOND_HOUSE]: E2eServerInstances.forServer(
                context.gameConfig,
                CrossServerHouseAssignment.SECOND_SERVER
            ).serverBaseUrl,
            [Login.TOWN_ROOM_NAME]: E2eServerInstances.fetchAllServersUrls()[0]
        });
    }

    static async keepUsersOnLeftServers(gameConfig, secondServerConfig)
    {
        for(let serverConfig of [gameConfig, secondServerConfig]){
            expect(
                await LoginServerApi.setDisconnectUsersOnServerChange(serverConfig, false),
                'The server keeps the user logged on the server it leaves'
            ).toBe(false);
        }
    }

    static async assignRoomsServersUrls(context, roomsServersUrls)
    {
        let secondServerConfig = E2eServerInstances.forServer(context.gameConfig, CrossServerHouseAssignment.SECOND_SERVER);
        for(let roomName of Object.keys(roomsServersUrls)){
            await E2eSeedAndRestoreApi.updateWithPreserve(
                context.gameConfig,
                context.e2eGroup,
                'rooms',
                {name: roomName},
                {server_url: roomsServersUrls[roomName]}
            );
        }
        for(let serverConfig of [context.gameConfig, secondServerConfig]){
            await SecurityApi.request(serverConfig, 'POST', '/api/e2e/data/reload-rooms', {
                group: context.e2eGroup,
                roomsNames: Object.keys(roomsServersUrls)
            });
        }
        return secondServerConfig;
    }

    static async fetchHouseArrival(gameConfig)
    {
        return ChangePointsSteps.fetchArrival(
            await ChangePointsSteps.loadTopology(gameConfig),
            CrossServerHouseAssignment.SECOND_HOUSE,
            Login.TOWN_ROOM_NAME
        );
    }

    static async storePlayerInHouse(context, playerName, offsetX)
    {
        let houseArrival = await CrossServerHouseAssignment.fetchHouseArrival(context.gameConfig);
        await E2eSeedAndRestoreApi.updateWithPreserve(context.gameConfig, context.e2eGroup, 'playersState', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: playerName})
        }, {room_id: houseArrival.roomId, x: houseArrival.x + offsetX, y: houseArrival.y});
        return houseArrival;
    }

    static async loginHouseObserver(context, offsetX)
    {
        let {page, gameConfig} = context;
        await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName3, offsetX);
        let houseObserver = (await Login.openClientPage(page, gameConfig)).clientPage;
        await Login.loginRootPlayer(houseObserver, gameConfig, context.longRun, '3');
        await Navigation.waitForRoom(houseObserver, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        return houseObserver;
    }

    static async walkFromTown(context, nextRoomName)
    {
        let topology = await ChangePointsSteps.loadTopology(context.gameConfig);
        await ChangePointsSteps.changeRoom(
            context,
            {page: context.page, playerName: context.gameConfig.e2ePlayerName},
            topology,
            ChangePointsSteps.buildWalk(topology, [Login.TOWN_ROOM_NAME, nextRoomName])[0]
        );
    }

    static async loginWithTownObserver(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let townSessionId = await page.evaluate(CrossServerHouseAssignment.READ_SESSION_ID);
        await SceneSpritesRecorder.waitForShownPlayer(secondPage, townSessionId, TimeConstants.SERVER_RESPONSE);
        return townSessionId;
    }

    static async loginWithRemoteChecks(context)
    {
        let {page, gameConfig, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await ChatSteps.recordChat(page);
        await LoginServerApi.setServerOverloaded(gameConfig, false, {blockingEnabled: true});
        let remoteServers = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/remote-servers', {});
        expect(remoteServers.remoteServersUrls, 'Server-1 asks server-2 for its status').toContain(
            secondServerConfig.serverBaseUrl
        );
        return secondServerConfig;
    }

    static async expectRefusedMove(context, nextRoomName, message, timeout)
    {
        let {page, gameConfig} = context;
        await RoomObjectsApi.placePlayerOnChangePoint(page, gameConfig, Login.TOWN_ROOM_NAME, nextRoomName);
        await expect(page.locator(Selectors.reloadModal.message), message).toHaveText(
            GameTranslations.game.errors.reconnectClient,
            {timeout}
        );
        expect(await Navigation.getCurrentRoomName(page), 'The player does not enter '+nextRoomName).not.toBe(nextRoomName);
    }

    static async fetchHouseArrivalState(page, secondServerConfig, playerName)
    {
        await page.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        return {
            isGameOver: await page.evaluate(() => Boolean(window.reldens.gameOver)),
            housePlayer: await GameplayE2eStateApi.fetchPlayer(
                secondServerConfig,
                CrossServerHouseAssignment.SECOND_HOUSE,
                playerName
            )
        };
    }

}

module.exports.CrossServerHouseAssignment = CrossServerHouseAssignment;
