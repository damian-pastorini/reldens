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

    async testThePendingValidationsCounterIsReleased()
    {
        await this.test('the pending password validations counter is released after each validation', async () => {
            let loginManager = this.createLoginManager({}).loginManager;
            let storedPassword = Encryptor.encryptPassword('secret');
            this.assert.strictEqual(await loginManager.validatePassword('secret', storedPassword), true);
            this.assert.strictEqual(await loginManager.validatePassword('wrong', storedPassword), false);
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

}

module.exports.TestLoginManagerUserRequest = TestLoginManagerUserRequest;
