/**
 *
 * Reldens - Game Session State
 *
 * Server side e2e endpoints for the game sessions: drops the socket of a player without a close handshake, sends the
 * room closing message, rejects the joins to one room by its origin, makes the last login record fail, removes the
 * game config from the initial game data and switches the players state handler of a room. The reset restores every
 * value before every test.
 *
 */

const { sc } = require('@reldens/utils');
const { RoomsConst } = require('../../../lib/rooms/constants');

class GameSessionState
{

    static OTHER_ORIGIN = 'https://e2e-other-origin.test';
    static isGameConfigStripped = false;
    static usersLoginRepository = false;
    static stateHandlerRooms = [];

    static fetchRoom(serverManager, roomName)
    {
        let roomsManager = serverManager.roomsManager;
        return roomsManager.createdInstances[roomsManager.instanceIdByName[roomName]];
    }

    static resetAll(serverManager)
    {
        GameSessionState.isGameConfigStripped = false;
        if(GameSessionState.usersLoginRepository){
            serverManager.loginManager.usersManager.usersLoginRepository = GameSessionState.usersLoginRepository;
        }
        for(let changedRoom of GameSessionState.stateHandlerRooms){
            changedRoom.room.applyPlayersLastStateHandler = changedRoom.value;
        }
        GameSessionState.stateHandlerRooms = [];
    }

    static registerEndpoints(serverManager)
    {
        GameSessionState.usersLoginRepository = serverManager.loginManager.usersManager.usersLoginRepository;
        serverManager.events.on('reldens.beforeSuperInitialGameData', (superInitialGameData) => {
            if(GameSessionState.isGameConfigStripped){
                delete superInitialGameData.gameConfig;
            }
        });
        let app = serverManager.app;
        app.post('/api/e2e/game-session/drop-connection', (request, response) => {
            let room = GameSessionState.fetchRoom(serverManager, sc.get(request.body, 'roomName', ''));
            let playerName = sc.get(request.body, 'playerName', '');
            room.clients.find(
                client => playerName === room.playerBySessionIdFromState(client.sessionId)?.playerName
            ).ref.terminate();
            response.json({ok: true});
        });
        app.post('/api/e2e/game-session/room-closing', (request, response) => {
            let roomName = sc.get(request.body, 'roomName', '');
            GameSessionState.fetchRoom(serverManager, roomName).broadcast('*', {
                act: RoomsConst.ROOM_CLOSING,
                listener: RoomsConst.MESSAGE_LISTENER_KEY,
                seconds: Number(sc.get(request.body, 'seconds', 0)),
                roomName
            });
            response.json({ok: true});
        });
        app.post('/api/e2e/game-session/reject-room-origin', (request, response) => {
            Object.assign(GameSessionState.fetchRoom(serverManager, sc.get(request.body, 'roomName', '')), {
                validateRoomsOriginRequest: true,
                allowRequestsWithoutOrigin: false,
                allowedOrigins: [GameSessionState.OTHER_ORIGIN]
            });
            response.json({ok: true});
        });
        app.post('/api/e2e/game-session/fail-last-login', (request, response) => {
            serverManager.loginManager.usersManager.usersLoginRepository = {
                create: () => Promise.reject(new Error('E2E last login failure.'))
            };
            response.json({ok: true});
        });
        app.post('/api/e2e/game-session/strip-game-config', (request, response) => {
            GameSessionState.isGameConfigStripped = true;
            response.json({ok: true});
        });
        app.post('/api/e2e/game-session/state-handler', (request, response) => {
            let room = GameSessionState.fetchRoom(serverManager, sc.get(request.body, 'roomName', ''));
            GameSessionState.stateHandlerRooms.push({room, value: room.applyPlayersLastStateHandler});
            room.applyPlayersLastStateHandler = true === sc.get(request.body, 'enabled', false);
            response.json({ok: true});
        });
    }

}

module.exports.GameSessionState = GameSessionState;
