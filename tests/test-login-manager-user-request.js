/**
 *
 * Reldens - Test Login Manager User Request
 *
 */

const { BaseTest } = require('./base-test');
const { LoginManager } = require('../lib/game/server/login-manager');
const { RoomGame } = require('../lib/rooms/server/game');
const { ActivePlayer } = require('../lib/game/server/memory/active-player');
const { GameConst } = require('../lib/game/constants');
const { RoomsConst } = require('../lib/rooms/constants');
const { Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestLoginManagerUserRequest extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.guestRoleId = 3;
        this.playerRoleId = 1;
        this.adminRoleId = 99;
    }

    createLoginManager(storedUsers)
    {
        let configValues = {'server/players/guestUser/roleId': this.guestRoleId};
        let loginManager = new LoginManager({
            config: {
                get: (path, defaultValue) => defaultValue,
                getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue),
                server: {players: {guestUser: {roleId: this.guestRoleId}}}
            },
            events: {on: () => true, emitSync: () => true, emit: async () => true}
        });
        let loginSetup = {loginManager, loadedUsernames: [], loadedEmails: [], guestRequests: []};
        loginManager.usersManager = {
            loadUserByUsername: async (username) => {
                loginSetup.loadedUsernames.push(username);
                return sc.get(storedUsers, username, false);
            },
            loadUserByEmail: async (email) => {
                loginSetup.loadedEmails.push(email);
                return sc.get(storedUsers, email, false);
            }
        };
        loginManager.userRegistration.processGuestRequest = async (userData, requestAddress, now, result) => {
            loginSetup.guestRequests.push(userData.username);
            return result;
        };
        return loginSetup;
    }

    async testTheNewGuestRequestNeverLoadsTheUsername()
    {
        await this.test('a new guest request is registered without looking up the supplied username', async () => {
            let loginSetup = this.createLoginManager({taken: {id: 1, username: 'taken'}});
            await loginSetup.loginManager.processUserRequest({username: 'taken', isGuest: true, isNewUser: true});
            this.assert.strictEqual(loginSetup.loadedUsernames.length, 0);
            this.assert.deepStrictEqual(loginSetup.guestRequests, ['taken']);
        });
    }

    async testTheUnknownGuestReloginRegistersAFailure()
    {
        await this.test('an unknown guest re-login registers a login failure instead of creating a guest', async () => {
            let loginSetup = this.createLoginManager({});
            let loginResult = await loginSetup.loginManager.processUserRequest(
                {username: 'ghost', password: 'secret', isGuest: true, isNewUser: false},
                '10.0.0.1'
            );
            let loginAttempts = loginSetup.loginManager.loginAttempts;
            this.assert.deepStrictEqual(loginResult, {error: GameConst.INVALID_LOGIN_MESSAGE});
            this.assert.strictEqual(loginSetup.guestRequests.length, 0);
            this.assert.strictEqual(loginAttempts.countHits(loginAttempts.identityKey('ghost'), Date.now()), 1);
        });
    }

    async testTheSaturatedPasswordValidationsRejectWithoutLoadingTheUser()
    {
        await this.test('the logins are rejected without loading the user when the validations are saturated', async () => {
            let loginSetup = this.createLoginManager({player: {id: 1, username: 'player'}});
            let loginManager = loginSetup.loginManager;
            loginManager.pendingPasswordValidations = loginManager.maxPendingPasswordValidations;
            let loginResult = await loginManager.processUserRequest({username: 'player', password: 'secret'});
            let adminResult = await loginManager.roleAuthenticationCallback('admin@test.com', 'x', this.adminRoleId);
            this.assert.deepStrictEqual(loginResult, {error: GameConst.INVALID_LOGIN_MESSAGE});
            this.assert.strictEqual(adminResult, false);
            this.assert.strictEqual(loginSetup.loadedUsernames.length, 0);
            this.assert.strictEqual(loginSetup.loadedEmails.length, 0);
        });
    }

    async testThePendingValidationsCounterIsReleasedAfterEachLogin()
    {
        await this.test('the reserved password validation is released after each game and admin login', async () => {
            let storedPassword = Encryptor.encryptPassword('secret');
            let storedUsers = {
                player: {id: 1, username: 'player', role_id: this.playerRoleId, status: '1', password: storedPassword}
            };
            let loginManager = this.createLoginManager(storedUsers).loginManager;
            let validLogin = await loginManager.processUserRequest({username: 'player', password: 'secret'});
            await loginManager.processUserRequest({username: 'player', password: 'wrong'});
            await loginManager.roleAuthenticationCallback('admin@test.com', 'x', this.adminRoleId);
            this.assert.strictEqual(validLogin.user.id, 1);
            this.assert.strictEqual(loginManager.pendingPasswordValidations, 0);
        });
    }

    async testTheConcurrentLoginsCannotExceedTheLimit()
    {
        await this.test('concurrent logins reserve the validation before the user lookup and respect the limit', async () => {
            let loginSetup = this.createLoginManager({player: {id: 1, username: 'player'}});
            let loginManager = loginSetup.loginManager;
            loginManager.maxPendingPasswordValidations = 1;
            await Promise.all([
                loginManager.processUserRequest({username: 'player', password: 'secret'}),
                loginManager.processUserRequest({username: 'player', password: 'secret'}),
                loginManager.roleAuthenticationCallback('admin@test.com', 'x', this.adminRoleId)
            ]);
            this.assert.deepStrictEqual(loginSetup.loadedUsernames, ['player']);
            this.assert.strictEqual(loginSetup.loadedEmails.length, 0);
            this.assert.strictEqual(loginManager.pendingPasswordValidations, 0);
        });
    }

    async testTheAdminLoginStoresTheSessionRevision()
    {
        await this.test('the administration login returns the user with its password hash revision', async () => {
            let storedPassword = Encryptor.encryptPassword('secret');
            let adminUser = {id: 5, email: 'admin@test.com', role_id: this.adminRoleId, status: '1'};
            adminUser.password = storedPassword;
            let loginManager = this.createLoginManager({'admin@test.com': adminUser}).loginManager;
            let authenticatedUser = await loginManager.roleAuthenticationCallback(
                'admin@test.com',
                'secret',
                this.adminRoleId
            );
            this.assert.strictEqual(authenticatedUser.sessionRevision, Encryptor.hashData(storedPassword));
        });
    }

    async testTheUsernameMustBeAString()
    {
        await this.test('a username that is not a string is rejected before any lookup', async () => {
            let loginSetup = this.createLoginManager({});
            let loginResult = await loginSetup.loginManager.processUserRequest({username: ['player'], password: 'x'});
            this.assert.deepStrictEqual(loginResult, {error: GameConst.INVALID_LOGIN_MESSAGE});
            this.assert.strictEqual(loginSetup.loadedUsernames.length, 0);
        });
    }

    async testTheGuestIsDetectedByRoleAndNotByEmail()
    {
        await this.test('a user is a guest only by the guest role, a guest domain email is not enough', async () => {
            let loginManager = this.createLoginManager({}).loginManager;
            let guestDomainPlayer = {id: 1, email: 'player@guest-reldens.com', role_id: this.playerRoleId};
            let guestUser = {id: 2, email: 'guest@test.com', role_id: this.guestRoleId};
            this.assert.strictEqual(loginManager.isGuestUser(guestDomainPlayer), false);
            this.assert.strictEqual(loginManager.isGuestUser(guestUser), true);
            let activePlayer = new ActivePlayer({guestRoleId: this.guestRoleId, userModel: guestDomainPlayer});
            let activeGuest = new ActivePlayer({guestRoleId: this.guestRoleId, userModel: guestUser});
            this.assert.strictEqual(activePlayer.isGuest, false);
            this.assert.strictEqual(activeGuest.isGuest, true);
        });
    }

    async testTheGuestDomainPlayerDoesNotGetThePasswordBack()
    {
        await this.test('a player role user with a guest domain email gets no guest password on start', async () => {
            let loginManager = this.createLoginManager({}).loginManager;
            loginManager.updateLastLogin = async () => true;
            loginManager.activePlayers = {add: () => true};
            let roomGame = Object.create(RoomGame.prototype, {roomId: {value: 'game-room'}});
            roomGame.loginManager = loginManager;
            roomGame.events = {emit: async () => true};
            roomGame.config = {client: {}, gameEngine: {}, availableFeaturesList: []};
            roomGame.activePlayerByUserName = () => false;
            let sentMessages = [];
            let client = {sessionId: 'session-a', send: (type, message) => sentMessages.push(message)};
            let userModel = {username: 'player', email: 'player@guest-reldens.com', role_id: this.playerRoleId};
            await roomGame.onJoin(client, {password: 'player-password'}, userModel);
            this.assert.strictEqual([...sentMessages].pop().guestPassword, '');
        });
    }

    async joinGameRoomWithAvailability(joinSetupValues, options)
    {
        let joinSetup = Object.assign(
            {configValues: {}, roomSelection: [], requestedRooms: [], lastLoginUpdates: [], sentMessages: []},
            joinSetupValues
        );
        let roomGame = Object.create(RoomGame.prototype, {roomId: {value: 'game-room'}});
        roomGame.loginManager = {
            updateLastLogin: async () => joinSetup.lastLoginUpdates.push(true),
            activePlayers: {add: () => true},
            isGuestUser: () => false
        };
        roomGame.events = {
            emit: async (eventName, eventData) => {
                if('reldens.beforeSuperInitialGameData' === eventName){
                    eventData.roomSelection = joinSetup.roomSelection;
                }
            }
        };
        roomGame.config = {
            client: {},
            gameEngine: {},
            availableFeaturesList: [],
            getWithoutLogs: (path, defaultValue) => sc.get(joinSetup.configValues, path, defaultValue)
        };
        roomGame.activePlayerByUserName = () => false;
        roomGame.roomsAvailability = {
            fetchRoomsAvailability: async (roomsNames) => {
                joinSetup.requestedRooms.push(...roomsNames);
                return sc.pickProps(joinSetup.availabilityByRoom, roomsNames);
            }
        };
        let userModel = {
            username: 'player',
            related_players: [{id: 1, state: {scene: 'reldens-bots-forest'}}, {id: 2, state: {scene: 'reldens-town'}}]
        };
        joinSetup.joinError = await roomGame.onJoin(
            {sessionId: 'session-a', send: (type, message) => joinSetup.sentMessages.push(message)},
            options,
            userModel
        ).then(() => '').catch((error) => error.message);
        return joinSetup;
    }

    async testTheAutoStartLoginIsRejectedWhenThePlayerRoomIsNotAvailable()
    {
        await this.test('the login without player selection is rejected when the player room is not available', async () => {
            let joinSetup = await this.joinGameRoomWithAvailability(
                {
                    availabilityByRoom: {
                        'reldens-bots-forest': {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY},
                        'reldens-town': {isAvailable: true, reason: ''}
                    }
                },
                {password: 'player-password'}
            );
            this.assert.strictEqual(joinSetup.joinError, GameConst.PLAYER_ROOM_UNAVAILABLE_MESSAGE);
            this.assert.strictEqual(joinSetup.lastLoginUpdates.length, 0);
            this.assert.strictEqual(joinSetup.sentMessages.length, 0);
        });
    }

    async testTheSelectionLoginSendsTheRoomsAvailability()
    {
        await this.test('the login with player selection sends the players and selection rooms availability', async () => {
            let busyRoom = {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY};
            let availableRoom = {isAvailable: true, reason: ''};
            let joinSetup = await this.joinGameRoomWithAvailability(
                {
                    configValues: {'client/players/multiplePlayers/enabled': true},
                    roomSelection: [
                        {name: RoomsConst.ROOM_LAST_LOCATION_KEY, title: 'Last Location'},
                        {name: 'reldens-town', title: 'Town'},
                        {name: 'reldens-forest', title: 'Forest'}
                    ],
                    availabilityByRoom: {
                        'reldens-bots-forest': busyRoom,
                        'reldens-town': availableRoom,
                        'reldens-forest': availableRoom
                    }
                },
                {password: 'player-password'}
            );
            this.assert.strictEqual(joinSetup.joinError, '');
            this.assert.deepStrictEqual(joinSetup.requestedRooms, ['reldens-bots-forest', 'reldens-town', 'reldens-forest']);
            this.assert.deepStrictEqual([...joinSetup.sentMessages].pop().roomsAvailability, {
                'reldens-bots-forest': busyRoom,
                'reldens-town': availableRoom,
                'reldens-forest': availableRoom
            });
        });
    }

    async testTheJoinOfASelectedPlayerSkipsTheLoginAvailability()
    {
        await this.test('the game room join of an already selected player does not request the availability', async () => {
            let joinSetup = await this.joinGameRoomWithAvailability(
                {availabilityByRoom: {}},
                {password: 'player-password', selectedPlayer: 1}
            );
            this.assert.strictEqual(joinSetup.joinError, '');
            this.assert.strictEqual(joinSetup.requestedRooms.length, 0);
            this.assert.strictEqual(joinSetup.lastLoginUpdates.length, 1);
        });
    }

}

module.exports.TestLoginManagerUserRequest = TestLoginManagerUserRequest;
