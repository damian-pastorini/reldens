/**
 *
 * Reldens - Test Server Change Disconnect Token Scope
 *
 * Tests the disconnection requested by the join of a player moving to a room of another server: the request body
 * carries the server change flag and its token signs the server change mark (and the check only mark when the
 * disconnection is disabled), so it is valid only as that kind of request; the receiving server disconnects the user as a server change only for that token (a normal token sent with
 * the flag or a server change token sent without it is rejected); the disconnection reaches every room of the user,
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

    async testTheServerChangeRequestSignsItsMark()
    {
        await this.test('the server change disconnect request sends its flag and a token valid only as a server change', async () => {
            let userDisconnection = this.createUserDisconnection([]);
            let sentBodies = [];
            await GlobalFetchStub.withFetch(async (requestUrl, options) => {
                sentBodies.push(sc.parseJson(options.body));
                return {ok: true, json: async () => ({isSuccess: true})};
            }, async () => {
                await userDisconnection.disconnectFromServer(this.serverUrl, this.username, true, false);
                await userDisconnection.disconnectFromServer(this.serverUrl, this.username, false, false);
                await userDisconnection.disconnectFromServer(this.serverUrl, this.username, true, true);
            });
            let valuesByKind = [
                userDisconnection.disconnectionTokenValues(this.serverUrl, this.username, true, false),
                userDisconnection.disconnectionTokenValues(this.serverUrl, this.username, false, false),
                userDisconnection.disconnectionTokenValues(this.serverUrl, this.username, true, true)
            ];
            let tokenValidations = sentBodies.map(body => [
                body.isServerChange,
                body.isCheckOnly,
                ...valuesByKind.map(tokenValues => userDisconnection.expiringHmacToken.validate(tokenValues, body.token, Date.now()))
            ]);
            this.assert.deepStrictEqual(tokenValidations, [
                [true, false, true, false, false],
                [false, false, false, true, false],
                [true, true, false, false, true]
            ]);
        });
    }

    async testTheReceivedServerChangeIsAcceptedOnlyWithItsToken()
    {
        await this.test('a server change disconnection is accepted only with its own token and flag', async () => {
            let disconnections = [];
            let userDisconnection = this.createUserDisconnection(disconnections);
            let createToken = (isServerChange) => userDisconnection.expiringHmacToken.generate(
                userDisconnection.disconnectionTokenValues(this.serverUrl, this.username, isServerChange, false),
                Date.now()+GameConst.SIGNED_TOKENS.DISCONNECT_EXPIRATION
            );
            let results = [];
            for(let requestCase of [
                {token: createToken(true), isServerChange: true},
                {token: createToken(false), isServerChange: true},
                {token: createToken(true), isServerChange: false},
                {token: createToken(false), isServerChange: false}
            ]){
                results.push(await userDisconnection.disconnectUserByLoginData({
                    body: {username: this.username, token: requestCase.token, isServerChange: requestCase.isServerChange}
                }));
            }
            this.assert.deepStrictEqual(
                [results, disconnections],
                [[true, false, false, true], [[this.username, true], [this.username, false]]]
            );
        });
    }

    createUserRooms(userModel, disconnectedRooms)
    {
        let activePlayers = new ActivePlayers.constructor();
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
        let activePlayers = new ActivePlayers.constructor();
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
                let token = userDisconnection.expiringHmacToken.generate(
                    userDisconnection.disconnectionTokenValues(this.serverUrl, this.username, true, false),
                    Date.now()+GameConst.SIGNED_TOKENS.DISCONNECT_EXPIRATION
                );
                results.push([
                    await userDisconnection.answerDisconnectRequest({
                        body: {username: this.username, token, isServerChange: true}
                    }),
                    closeCodes
                ]);
            }
            let consentedCode = SyncServerDriver.CloseCode.CONSENTED;
            let serverChangeCode = GameConst.DISCONNECTION.SERVER_CHANGE_CLOSE_CODE;
            this.assert.deepStrictEqual(results, [
                [{isSuccess: true, wasLogged: false}, [['game-room', consentedCode], ['town-room', consentedCode]]],
                [{isSuccess: true, wasLogged: true}, [['game-room', serverChangeCode], ['town-room', serverChangeCode]]],
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
