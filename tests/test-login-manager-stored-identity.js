/**
 *
 * Reldens - Test Login Manager Stored Identity
 *
 */

const { BaseTest } = require('./base-test');
const { LoginManager } = require('../lib/game/server/login-manager');
const { GameConst } = require('../lib/game/constants');
const { Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestLoginManagerStoredIdentity extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.rolesIds = {guest: 3, player: 1, admin: 99};
        this.maxAttempts = 2;
    }

    createLoginManager(usersByLookupValue)
    {
        let loginManager = new LoginManager({
            config: {
                get: (path, defaultValue) => defaultValue,
                getWithoutLogs: (path, defaultValue) => defaultValue,
                server: {players: {guestUser: {roleId: this.rolesIds.guest}}}
            },
            events: {on: () => true, emitSync: () => true, emit: async () => true},
            usersManager: {
                loadUserByUsername: async (username) => sc.get(usersByLookupValue, username, false),
                loadUserByEmail: async (email) => sc.get(usersByLookupValue, email, false)
            }
        });
        loginManager.loginAttempts.maxAttempts = this.maxAttempts;
        return loginManager;
    }

    async testTheUsernameVariantsBlockTheStoredUsername()
    {
        await this.test('the failed logins of the username variants block the stored username', async () => {
            let storedUser = {id: 1, username: 'player', role_id: this.rolesIds.player, status: '1'};
            storedUser.password = Encryptor.encryptPassword('secret');
            let loginManager = this.createLoginManager({
                'pláyer': storedUser,
                'plàyer': storedUser,
                'plâyer': storedUser
            });
            let gameLogin = loginManager.gameLogin;
            await gameLogin.processUserRequest({username: 'pláyer', password: 'wrong'});
            await gameLogin.processUserRequest({username: 'plàyer', password: 'wrong'});
            let blockedLogin = await gameLogin.processUserRequest({username: 'plâyer', password: 'secret'});
            this.assert.deepStrictEqual(blockedLogin, {error: GameConst.INVALID_LOGIN_MESSAGE});
            this.assert.strictEqual(loginManager.loginAttempts.isLoginBlocked('player', '', Date.now()), true);
        });
    }

    async testTheEmailVariantsBlockTheStoredEmail()
    {
        await this.test('the failed admin logins of the email variants block the stored email', async () => {
            let adminUser = {id: 5, email: 'admin@test.com', role_id: this.rolesIds.admin, status: '1'};
            adminUser.password = Encryptor.encryptPassword('secret');
            let loginManager = this.createLoginManager({
                'ádmin@test.com': adminUser,
                'àdmin@test.com': adminUser,
                'âdmin@test.com': adminUser
            });
            let administrationLogin = loginManager.administrationLogin;
            await administrationLogin.roleAuthenticationCallback('ádmin@test.com', 'wrong', this.rolesIds.admin);
            await administrationLogin.roleAuthenticationCallback('àdmin@test.com', 'wrong', this.rolesIds.admin);
            let blockedLogin = await administrationLogin.roleAuthenticationCallback(
                'âdmin@test.com',
                'secret',
                this.rolesIds.admin
            );
            this.assert.strictEqual(blockedLogin, false);
            this.assert.strictEqual(loginManager.loginAttempts.isLoginBlocked('admin@test.com', '', Date.now()), true);
        });
    }

}

module.exports.TestLoginManagerStoredIdentity = TestLoginManagerStoredIdentity;
