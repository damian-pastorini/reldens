/**
 *
 * Reldens - Login Server State
 *
 * Server side e2e endpoints for the login guards that depend on the server state: the overloaded server (blocking or
 * only monitored), the created rooms, the rooms availability seen by the game room, the rooms origin validation, the
 * other servers of a multi-server setup (with a route answering an error that counts its requests) and the signed
 * disconnection tokens. The reset runs with the SecurityState one before every test.
 *
 */

const { sc } = require('@reldens/utils');
const { GameConst } = require('../../../lib/game/constants');
const { FirebaseE2eState } = require('./firebase-e2e-state');
const { CharacterE2eState } = require('./character-e2e-state');
const { GameSessionState } = require('./game-session-state');

class LoginServerState
{

    static OVERLOADED_MEMORY_LIMIT = 0.0001;
    static OTHER_SERVER_ERROR_PATH = '/api/e2e/security/other-server-error';
    static UNKNOWN_STATE_COLUMN = 'e2e_unknown_column';
    static brokenSavePlayerIds = [];
    static guestRoomsDefaults = {};
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
            roomsPerServer: userDisconnection.roomsPerServer,
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

    static fetchGameRooms(serverManager)
    {
        return LoginServerState.fetchCreatedRooms(serverManager).filter(room => GameConst.ROOM_GAME === room.roomName);
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
        for(let gameRoom of LoginServerState.fetchGameRooms(serverManager)){
            LoginServerState.originalAvailability[gameRoom.roomId] = gameRoom.roomsAvailability;
            gameRoom.roomsAvailability = {fetchRoomsAvailability: LoginServerState.markRoomsUnavailable};
        }
    }

    static restoreRoomsAvailability(serverManager)
    {
        for(let gameRoom of LoginServerState.fetchGameRooms(serverManager)){
            if(sc.hasOwn(LoginServerState.originalAvailability, gameRoom.roomId)){
                gameRoom.roomsAvailability = LoginServerState.originalAvailability[gameRoom.roomId];
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
        userDisconnection.roomsPerServer = {[serverUrl]: ['e2e-other-server-room']};
        userDisconnection.disconnectUsersOnServerChange = disconnectUsersOnServerChange;
        LoginServerState.otherServerHits = 0;
    }

    static async fetchActiveSessionsCount(serverManager, username)
    {
        return Object.keys(sc.get(
            serverManager.loginManager.activePlayers.playersSessionsByUserId,
            (await serverManager.dataServer.getEntity('users').loadOneBy('username', username)).id,
            {}
        )).length;
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

    static resetAll(serverManager)
    {
        serverManager.roomsManager.availableRoomsGuest = LoginServerState.guestRoomsDefaults;
        LoginServerState.brokenSavePlayerIds = [];
        FirebaseE2eState.resetAll(serverManager);
        CharacterE2eState.resetAll(serverManager);
        GameSessionState.resetAll(serverManager);
        LoginServerState.setServerOverloaded(serverManager, false, LoginServerState.healthDefaults.blockingEnabled);
        LoginServerState.restoreRoomsAvailability(serverManager);
        LoginServerState.applyRoomsOrigin(serverManager, LoginServerState.roomsOriginDefaults);
        Object.assign(serverManager.loginManager.userDisconnection, LoginServerState.disconnectionDefaults);
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
            response.json({
                count: await LoginServerState.fetchActiveSessionsCount(serverManager, sc.get(request.query, 'username', ''))
            });
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
        LoginServerState.registerGuestsEndpoints(serverManager);
        LoginServerState.registerSessionsEndpoints(serverManager);
        FirebaseE2eState.registerEndpoints(serverManager);
        CharacterE2eState.registerEndpoints(serverManager);
        GameSessionState.registerEndpoints(serverManager);
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
        app.get('/api/e2e/login-server/other-server-hits', (request, response) => {
            response.json({hits: LoginServerState.otherServerHits});
        });
        app.post('/api/e2e/login-server/disconnect-token', (request, response) => {
            response.json({
                token: serverManager.loginManager.expiringHmacToken.generate(
                    [sc.get(request.body, 'username', '')],
                    Number(sc.get(request.body, 'expiresAt', 0))
                )
            });
        });
        app.post(LoginServerState.OTHER_SERVER_ERROR_PATH+GameConst.ROUTE_PATHS.DISCONNECT_USER, (request, response) => {
            LoginServerState.otherServerHits++;
            response.status(500).json({isSuccess: false});
        });
    }

}

module.exports.LoginServerState = LoginServerState;
