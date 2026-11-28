/**
 *
 * Reldens - Test Server Change Disconnect Token Scope
 *
 * Tests the disconnection requested by the join of a player moving to a room of another server: the message action is
 * the server change (the check only when the disconnection is disabled, the disconnection on a login) and its token
 * signs it, so it is valid only as that kind of message; the receiving server disconnects the user as a server change
 * only for that action (a disconnection signed message sent as a server change or the other way around is rejected);
 * the disconnection reaches every room of the user,
 * the game room session too (it has no player), unless the game room is avoided; a server change request for a user
 * settled in a scene here (its body not changing scene) is a forged move, so it ends the user as a new login (every
 * room closed with the consented code, answered as not logged) while a player changing scene or with no scene player
 * yet gets the server change close and is answered as logged; and the game room leaves the client with the server
 * change close code instead of the consented one.
 *
 */

const { BaseTest } = require('./base-test');
const { LoginManager } = require('../lib/game/server/login-manager');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');
const { GlobalFetchStub } = require('./fixtures/global-fetch-stub');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { UserDisconnectionBuilder } = require('./fixtures/user-disconnection-builder');
const { RoomLogin } = require('../lib/rooms/server/login');
const { RoomGame } = require('../lib/rooms/server/game');
const { ActivePlayers } = require('../lib/game/server/memory/active-players');
const { UserDisconnection } = require('../lib/game/server/user-disconnection');
const { SyncServerDriver } = require('../lib/sync/server/colyseus/sync-server-driver');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestServerChangeDisconnectTokenScope extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.serverUrl = 'http://server-a:8080';
        this.username = 'mover';
    }

    createUserDisconnection(disconnections)
    {
        let userDisconnection = new LoginManager({
            config: {get: (path, defaultValue) => defaultValue, getWithoutLogs: (path, defaultValue) => defaultValue},
            events: {on: () => true},
            serverToServerMessengerProps: ServerMessengerPropsBuilder.createShared(this.serverUrl, {}, 'test-secret')
        }).userDisconnection;
        userDisconnection.expiringHmacToken = new ExpiringHmacToken({secret: 'test-secret'});
        userDisconnection.activePlayers = {fetchByUserNameInAnyRoom: () => ({userModel: {username: this.username}})};
        userDisconnection.roomsManager = {createdInstances: {}};
        userDisconnection.disconnectUserFromEveryRoom = async (userModel, avoidGameRoom, isServerChange) => {
            disconnections.push([userModel.username, isServerChange]);
            return true;
        };
        return userDisconnection;
    }

    async testTheServerChangeRequestSignsItsAction()
    {
        await this.test('the disconnect message action is the server change, the disconnection or the check only and its token signs it', async () => {
            let sender = this.createUserDisconnection([]);
            sender.otherServersUrls = [this.serverUrl];
            let sentBodies = [];
            await GlobalFetchStub.withFetch(async (requestUrl, options) => {
                sentBodies.push(sc.parseJson(options.body));
                return {ok: true, json: async () => ({isSuccess: true})};
            }, async () => {
                await sender.broadcastDisconnectionMessage({username: this.username}, true);
                await sender.broadcastDisconnectionMessage({username: this.username}, false);
                sender.disconnectUsersOnServerChange = false;
                await sender.broadcastDisconnectionMessage({username: this.username}, true);
            });
            let receiver = this.createUserDisconnection([]);
            let actions = [
                GameConst.DISCONNECTION.SERVER_CHANGE,
                GameConst.DISCONNECTION.DISCONNECT,
                GameConst.DISCONNECTION.CHECK_ONLY
            ];
            let validations = sentBodies.map(body => [
                body.action,
                ...actions.map(action => receiver.isValidRequest(Object.assign({}, body, {action}), Date.now()))
            ]);
            this.assert.deepStrictEqual(validations, [
                [GameConst.DISCONNECTION.SERVER_CHANGE, true, false, false],
                [GameConst.DISCONNECTION.DISCONNECT, false, true, false],
                [GameConst.DISCONNECTION.CHECK_ONLY, false, false, true]
            ]);
        });
    }

    async testTheReceivedServerChangeIsAcceptedOnlyWithItsAction()
    {
        await this.test('a server change disconnection is accepted only with its own signed action', async () => {
            let disconnections = [];
            let userDisconnection = this.createUserDisconnection(disconnections);
            let serverChangeBody = UserDisconnectionBuilder.createRequestBody(
                userDisconnection,
                this.username,
                GameConst.DISCONNECTION.SERVER_CHANGE
            );
            let disconnectBody = UserDisconnectionBuilder.createRequestBody(userDisconnection, this.username);
            let results = [];
            for(let body of [
                Object.assign({}, serverChangeBody, {action: GameConst.DISCONNECTION.DISCONNECT}),
                Object.assign({}, disconnectBody, {action: GameConst.DISCONNECTION.SERVER_CHANGE}),
                serverChangeBody,
                disconnectBody
            ]){
                results.push((await userDisconnection.receiveRequest({body})).isSuccess);
            }
            this.assert.deepStrictEqual(
                [results, disconnections],
                [[false, false, true, true], [[this.username, true], [this.username, false]]]
            );
        });
    }

    createUserRooms(userModel, disconnectedRooms)
    {
        let activePlayers = new ActivePlayers();
        activePlayers.gameRoomInstanceId = 'game-room';
        let rooms = {
            'game-room': Object.create(RoomGame.prototype, {roomId: {value: 'game-room'}}),
            'town-room': Object.create(RoomLogin.prototype, {roomId: {value: 'town-room'}})
        };
        for(let roomId of Object.keys(rooms)){
            rooms[roomId].loginManager = {activePlayers};
            rooms[roomId].disconnectBySessionId = async (sessionId, client, user, isServerChange) => {
                disconnectedRooms.push([roomId, sessionId, isServerChange]);
            };
            activePlayers.add(userModel, {sessionId: 'session-'+roomId}, rooms[roomId]);
        }
        return rooms;
    }

    async testEveryRoomOfTheUserIsDisconnectedTheGameRoomToo()
    {
        await this.test('the user is disconnected from every room, the game room too, unless the game room is avoided', async () => {
            let results = [];
            for(let avoidGameRoom of [false, true]){
                let userModel = {id: 7, username: this.username};
                let disconnectedRooms = [];
                let userDisconnection = this.createUserDisconnection([]);
                userDisconnection.disconnectUserFromEveryRoom = UserDisconnection.prototype.disconnectUserFromEveryRoom;
                userDisconnection.roomsManager = {createdInstances: this.createUserRooms(userModel, disconnectedRooms)};
                await userDisconnection.disconnectUserFromEveryRoom(userModel, avoidGameRoom, true);
                results.push(disconnectedRooms);
            }
            this.assert.deepStrictEqual(results, [
                [['game-room', 'session-game-room', true], ['town-room', 'session-town-room', true]],
                [['town-room', 'session-town-room', true]]
            ]);
        });
    }

    createSceneServer(sceneBody, closeCodes)
    {
        let userModel = {id: 7, username: this.username};
        let activePlayers = new ActivePlayers();
        activePlayers.gameRoomInstanceId = 'game-room';
        let rooms = {'game-room': Object.create(RoomGame.prototype, {roomId: {value: 'game-room'}})};
        if(sceneBody){
            rooms['town-room'] = Object.create(RoomLogin.prototype, {roomId: {value: 'town-room'}});
            rooms['town-room'].playerBySessionIdFromState = () => ({physicalBody: sceneBody});
        }
        for(let roomId of Object.keys(rooms)){
            rooms[roomId].loginManager = {activePlayers};
            activePlayers.add(
                userModel,
                {sessionId: 'session-'+roomId, leave: (closeCode) => closeCodes.push([roomId, closeCode])},
                rooms[roomId]
            );
        }
        let userDisconnection = this.createUserDisconnection([]);
        userDisconnection.disconnectUserFromEveryRoom = UserDisconnection.prototype.disconnectUserFromEveryRoom;
        userDisconnection.activePlayers = activePlayers;
        userDisconnection.roomsManager = {createdInstances: rooms};
        return userDisconnection;
    }

    async testAServerChangeForASettledScenePlayerEndsItAsANewLogin()
    {
        await this.test('a server change request ends a settled scene player as a new login, a moving or unplaced one gets the server change close', async () => {
            let results = [];
            for(let sceneBody of [{isChangingScene: false}, {isChangingScene: true}, false]){
                let closeCodes = [];
                let userDisconnection = this.createSceneServer(sceneBody, closeCodes);
                let body = UserDisconnectionBuilder.createRequestBody(
                    userDisconnection,
                    this.username,
                    GameConst.DISCONNECTION.SERVER_CHANGE
                );
                results.push([await userDisconnection.receiveRequest({body}), closeCodes]);
            }
            let consentedCode = SyncServerDriver.CloseCode.CONSENTED;
            let serverChangeCode = GameConst.DISCONNECTION.SERVER_CHANGE_CLOSE_CODE;
            this.assert.deepStrictEqual(results, [
                [{isSuccess: true, wasLogged: false}, [['town-room', consentedCode], ['game-room', consentedCode]]],
                [{isSuccess: true, wasLogged: true}, [['town-room', serverChangeCode], ['game-room', serverChangeCode]]],
                [{isSuccess: true, wasLogged: true}, [['game-room', serverChangeCode]]]
            ]);
        });
    }

    async testTheGameRoomLeavesWithTheServerChangeCode()
    {
        await this.test('the game room leaves the client with the server change code only on a server change', async () => {
            let roomLogin = Object.create(RoomLogin.prototype, {roomId: {value: 'game-room'}});
            roomLogin.loginManager = {activePlayers: {removeByRoomAndSessionId: () => true}};
            let closeCodes = [];
            let client = {leave: (code) => closeCodes.push(code)};
            roomLogin.disconnectBySessionId('session-1', client, {username: this.username}, true);
            roomLogin.disconnectBySessionId('session-1', client, {username: this.username});
            this.assert.deepStrictEqual(
                closeCodes,
                [GameConst.DISCONNECTION.SERVER_CHANGE_CLOSE_CODE, SyncServerDriver.CloseCode.CONSENTED]
            );
        });
    }

}

module.exports.TestServerChangeDisconnectTokenScope = TestServerChangeDisconnectTokenScope;
