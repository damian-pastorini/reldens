/**
 *
 * Reldens - Login Server State
 *
 * Server side e2e endpoints for the login guards that depend on the server state: the overloaded server (blocking or
 * only monitored), the created rooms, the rooms availability seen by the game room, the rooms origin validation, the
 * other servers of a multi-server setup (with a route answering an error and a route answering only after three times
 * the disconnection request timeout, both counting their requests), the disconnection of the users on a server change
 * switched off or on (restored by the reset), the tokens signed over the given values (the
 * disconnection and the server status ones) and the ServersSignedRequestsState ones. The reset runs with the
 * SecurityState one before every test.
 *
 */

const { sc } = require('@reldens/utils');
const { GameConst } = require('../../../lib/game/constants');
const { ServersSignedRequestsState } = require('./servers-signed-requests-state');
const { FirebaseE2eState } = require('./firebase-e2e-state');
const { CharacterE2eState } = require('./character-e2e-state');
const { GameSessionState } = require('./game-session-state');

class LoginServerState
{

    static OVERLOADED_MEMORY_LIMIT = 0.0001;
    static OTHER_SERVER_ERROR_PATH = '/api/e2e/security/other-server-error';
    static OTHER_SERVER_SILENT_PATH = '/api/e2e/security/other-server-silent';
    static SILENT_ANSWER_MS = GameConst.DISCONNECTION.REQUEST_TIMEOUT_MS * 3;
    static UNKNOWN_STATE_COLUMN = 'e2e_unknown_column';
    static brokenSavePlayerIds = [];
    static guestRoomsDefaults = {};
    static allowGuestOnRoomsDefault = false;
    static healthDefaults = {};
    static disconnectionDefaults = {};
    static roomsOriginDefaults = {};
    static originalAvailability = {};
    static otherServerHits = 0;

    static captureDefaults(serverManager)
    {
        let monitor = serverManager.serverHealthMonitor;
        let userDisconnection = serverManager.loginManager.userDisconnection;
        LoginServerState.healthDefaults = {
            blockingEnabled: monitor.blockingEnabled,
            maxMemoryPercent: monitor.limits.maxMemoryPercent
        };
        LoginServerState.disconnectionDefaults = {
            otherServersUrls: [...userDisconnection.otherServersUrls],
            disconnectUsersOnServerChange: userDisconnection.disconnectUsersOnServerChange
        };
        LoginServerState.roomsOriginDefaults = {
            validate: serverManager.configManager.getWithoutLogs('server/rooms/validateRoomsOriginRequest', false),
            allowWithoutOrigin: serverManager.configManager.getWithoutLogs('server/rooms/allowRequestsWithoutOrigin', true)
        };
    }

    static setServerOverloaded(serverManager, isOverloaded, blockingEnabled)
    {
        let monitor = serverManager.serverHealthMonitor;
        monitor.blockingEnabled = blockingEnabled;
        monitor.limits.maxMemoryPercent = isOverloaded
            ? LoginServerState.OVERLOADED_MEMORY_LIMIT
            : LoginServerState.healthDefaults.maxMemoryPercent;
        monitor.checkUsage();
    }

    static fetchCreatedRooms(serverManager)
    {
        let createdInstances = serverManager.roomsManager.createdInstances;
        return Object.keys(createdInstances).map(roomId => createdInstances[roomId]);
    }

    static markRoomsUnavailable(roomsNames, knownAvailability)
    {
        for(let roomName of roomsNames){
            knownAvailability[roomName] = {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY};
        }
        return knownAvailability;
    }

    static setRoomsUnavailable(serverManager)
    {
        for(let gameRoom of LoginServerState.fetchCreatedRooms(serverManager)){
            if(GameConst.ROOM_GAME !== gameRoom.roomName){
                continue;
            }
            LoginServerState.originalAvailability[gameRoom.roomId] = gameRoom.roomsAvailability;
            gameRoom.roomsAvailability = {fetchRoomsAvailability: LoginServerState.markRoomsUnavailable};
        }
    }

    static restoreRoomsAvailability(serverManager)
    {
        for(let roomId of Object.keys(LoginServerState.originalAvailability)){
            let gameRoom = serverManager.roomsManager.createdInstances[roomId];
            if(gameRoom){
                gameRoom.roomsAvailability = LoginServerState.originalAvailability[roomId];
            }
        }
        LoginServerState.originalAvailability = {};
    }

    static applyRoomsOrigin(serverManager, roomsOrigin)
    {
        for(let room of LoginServerState.fetchCreatedRooms(serverManager)){
            room.validateRoomsOriginRequest = roomsOrigin.validate;
            room.allowRequestsWithoutOrigin = roomsOrigin.allowWithoutOrigin;
            room.allowedOrigins = sc.get(roomsOrigin, 'allowedOrigins', room.allowedOrigins);
        }
    }

    static setOtherServer(serverManager, serverUrl, disconnectUsersOnServerChange)
    {
        let userDisconnection = serverManager.loginManager.userDisconnection;
        userDisconnection.otherServersUrls = [serverUrl];
        userDisconnection.disconnectUsersOnServerChange = disconnectUsersOnServerChange;
        LoginServerState.otherServerHits = 0;
    }

    static async fetchActiveSessions(serverManager, username)
    {
        let userSessions = sc.get(
            serverManager.loginManager.activePlayers.playersSessionsByUserId,
            (await serverManager.dataServer.getEntity('users').loadOneBy('username', username)).id,
            {}
        );
        let createdInstances = serverManager.roomsManager.createdInstances;
        return {
            count: Object.keys(userSessions).length,
            rooms: Object.keys(userSessions).map(
                sessionId => sc.get(createdInstances[userSessions[sessionId]], 'roomName', 'room id '+userSessions[sessionId])
            )
        };
    }

    static fetchRoomByName(serverManager, roomName)
    {
        let roomsManager = serverManager.roomsManager;
        return roomsManager.createdInstances[roomsManager.instanceIdByName[roomName]];
    }

    static countPlayersInRoom(room, playerName)
    {
        return room.playersKeysFromState().filter(
            sessionId => playerName === room.playerBySessionIdFromState(sessionId).playerName
        ).length;
    }

    static async resetAll(serverManager)
    {
        serverManager.roomsManager.availableRoomsGuest = LoginServerState.guestRoomsDefaults;
        serverManager.roomsManager.allowGuestOnRooms = LoginServerState.allowGuestOnRoomsDefault;
        LoginServerState.brokenSavePlayerIds = [];
        FirebaseE2eState.resetAll(serverManager);
        CharacterE2eState.resetAll(serverManager);
        GameSessionState.resetAll(serverManager);
        LoginServerState.setServerOverloaded(serverManager, false, LoginServerState.healthDefaults.blockingEnabled);
        LoginServerState.restoreRoomsAvailability(serverManager);
        LoginServerState.applyRoomsOrigin(serverManager, LoginServerState.roomsOriginDefaults);
        Object.assign(serverManager.loginManager.userDisconnection, LoginServerState.disconnectionDefaults);
        await ServersSignedRequestsState.resetAll(serverManager);
        LoginServerState.otherServerHits = 0;
    }

    static registerGuestsEndpoints(serverManager)
    {
        let app = serverManager.app;
        let guestsCleanup = serverManager.featuresManager.featuresList.users.package.guestsCleanup;
        app.post('/api/e2e/login-server/guests-cleanup', async (request, response) => {
            response.json({deleted: await guestsCleanup.removeStaleGuests(Number(sc.get(request.body, 'olderThanTime', 0)))});
        });
        app.post('/api/e2e/login-server/guest-claim', async (request, response) => {
            response.json({
                deleted: await guestsCleanup.usersManager.deleteGuestUser(
                    sc.get(request.body, 'staleGuest', {}),
                    Number(sc.get(request.body, 'olderThanTime', 0))
                )
            });
        });
        app.post('/api/e2e/login-server/guest-rooms-empty', (request, response) => {
            serverManager.roomsManager.availableRoomsGuest = {};
            response.json({ok: true});
        });
        app.post('/api/e2e/login-server/guest-rooms-allow-on-rooms', (request, response) => {
            let roomsManager = serverManager.roomsManager;
            roomsManager.allowGuestOnRooms = true === sc.get(request.body, 'allowOnRooms', false);
            roomsManager.availableRoomsGuest = roomsManager.fetchGuestRooms(roomsManager.loadedRoomsByName);
            response.json({guestRooms: Object.keys(roomsManager.availableRoomsGuest)});
        });
    }

    static registerSessionsEndpoints(serverManager)
    {
        serverManager.events.on('reldens.onSavePlayerStateBefore', (saveEvent) => {
            if(LoginServerState.brokenSavePlayerIds.includes(saveEvent.playerId)){
                saveEvent.updatePatch[LoginServerState.UNKNOWN_STATE_COLUMN] = 1;
            }
        });
        let app = serverManager.app;
        app.get('/api/e2e/login-server/active-sessions', async (request, response) => {
            response.json(await LoginServerState.fetchActiveSessions(serverManager, sc.get(request.query, 'username', '')));
        });
        app.get('/api/e2e/login-server/players-in-room', (request, response) => {
            response.json({
                count: LoginServerState.countPlayersInRoom(
                    LoginServerState.fetchRoomByName(serverManager, sc.get(request.query, 'roomName', '')),
                    sc.get(request.query, 'playerName', '')
                )
            });
        });
        app.post('/api/e2e/login-server/break-player-state-save', (request, response) => {
            let room = LoginServerState.fetchRoomByName(serverManager, sc.get(request.body, 'roomName', ''));
            let playerName = sc.get(request.body, 'playerName', '');
            for(let sessionId of room.playersKeysFromState()){
                let playerSchema = room.playerBySessionIdFromState(sessionId);
                if(playerName === playerSchema.playerName){
                    LoginServerState.brokenSavePlayerIds.push(playerSchema.player_id);
                }
            }
            response.json({ok: true});
        });
    }

    static registerEndpoints(serverManager)
    {
        LoginServerState.captureDefaults(serverManager);
        LoginServerState.guestRoomsDefaults = serverManager.roomsManager.availableRoomsGuest;
        LoginServerState.allowGuestOnRoomsDefault = serverManager.roomsManager.allowGuestOnRooms;
        LoginServerState.registerGuestsEndpoints(serverManager);
        LoginServerState.registerSessionsEndpoints(serverManager);
        FirebaseE2eState.registerEndpoints(serverManager);
        CharacterE2eState.registerEndpoints(serverManager);
        GameSessionState.registerEndpoints(serverManager);
        ServersSignedRequestsState.registerEndpoints(serverManager);
        let app = serverManager.app;
        app.post('/api/e2e/login-server/overloaded', (request, response) => {
            let isOverloaded = true === sc.get(request.body, 'isOverloaded', false);
            LoginServerState.setServerOverloaded(
                serverManager,
                isOverloaded,
                true === sc.get(request.body, 'blockingEnabled', isOverloaded || LoginServerState.healthDefaults.blockingEnabled)
            );
            response.json({ok: true});
        });
        app.get('/api/e2e/login-server/usage-report', (request, response) => {
            response.json(serverManager.serverHealthMonitor.usageReport);
        });
        app.get('/api/e2e/login-server/room-created', (request, response) => {
            response.json({isCreated: serverManager.roomsManager.isRoomCreated(sc.get(request.query, 'roomName', ''))});
        });
        app.post('/api/e2e/login-server/rooms-unavailable', (request, response) => {
            LoginServerState.setRoomsUnavailable(serverManager);
            response.json({ok: true});
        });
        app.post('/api/e2e/login-server/rooms-origin', (request, response) => {
            LoginServerState.applyRoomsOrigin(serverManager, request.body);
            response.json({ok: true});
        });
        app.post('/api/e2e/login-server/other-server', (request, response) => {
            LoginServerState.setOtherServer(
                serverManager,
                sc.get(request.body, 'serverUrl', ''),
                true === sc.get(request.body, 'disconnectUsersOnServerChange', true)
            );
            response.json({ok: true});
        });
        app.post('/api/e2e/login-server/disconnect-on-server-change', (request, response) => {
            serverManager.loginManager.userDisconnection.disconnectUsersOnServerChange = true === sc.get(
                request.body,
                'enabled',
                true
            );
            response.json({enabled: serverManager.loginManager.userDisconnection.disconnectUsersOnServerChange});
        });
        app.get('/api/e2e/login-server/other-server-hits', (request, response) => {
            response.json({hits: LoginServerState.otherServerHits});
        });
        app.post('/api/e2e/login-server/disconnect-token', (request, response) => {
            let userDisconnection = serverManager.loginManager.userDisconnection;
            response.json({
                token: serverManager.loginManager.expiringHmacToken.generate(
                    userDisconnection.disconnectionTokenValues(
                        serverManager.serverToServerMessengerProps.serverSelfAddress,
                        sc.get(request.body, 'username', ''),
                        false,
                        false
                    ),
                    Number(sc.get(request.body, 'expiresAt', 0))
                )
            });
        });
        app.post('/api/e2e/login-server/signed-token', (request, response) => {
            response.json({
                token: serverManager.loginManager.expiringHmacToken.generate(
                    sc.get(request.body, 'values', []),
                    Number(sc.get(request.body, 'expiresAt', 0))
                )
            });
        });
        app.post(LoginServerState.OTHER_SERVER_ERROR_PATH+GameConst.ROUTE_PATHS.DISCONNECT_USER, (request, response) => {
            LoginServerState.otherServerHits++;
            response.status(500).json({isSuccess: false});
        });
        app.post(LoginServerState.OTHER_SERVER_SILENT_PATH+GameConst.ROUTE_PATHS.DISCONNECT_USER, (request, response) => {
            LoginServerState.otherServerHits++;
            setTimeout(() => response.json({isSuccess: true}), LoginServerState.SILENT_ANSWER_MS);
        });
    }

}

module.exports.LoginServerState = LoginServerState;
