/**
 *
 * Reldens - Test Admin Session Validator
 *
 */

const { BaseTest } = require('./base-test');
const { AdminSessionValidator } = require('../lib/admin/server/admin-session-validator');
const { Encryptor } = require('@reldens/server-utils');

class TestAdminSessionValidator extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.adminRoleId = 99;
        this.passwordHash = Encryptor.encryptPassword('admin-password');
        this.loginPath = '/reldens-admin/login';
    }

    async validateSession(loadUserById, sessionRevision, requestHeaders = {}, blackList = {})
    {
        let validation = {redirects: [], destroyedSessions: 0, nextCalls: 0};
        let adminSessionValidator = new AdminSessionValidator({
            usersRepository: {loadById: loadUserById},
            adminRoleId: this.adminRoleId
        });
        let request = {
            path: '/users',
            headers: requestHeaders,
            session: {
                user: {id: 5, sessionRevision},
                destroy: (callback) => {
                    validation.destroyedSessions++;
                    callback();
                }
            }
        };
        await adminSessionValidator.validate(
            {
                req: request,
                res: {redirect: (path) => validation.redirects.push(path)},
                next: () => validation.nextCalls++
            },
            {router: {rootPath: '/reldens-admin', loginPath: '/login', blackList}}
        );
        return validation;
    }

    createAdminUserLoader(overrides)
    {
        return async () => Object.assign(
            {id: 5, role_id: this.adminRoleId, status: '1', password: this.passwordHash},
            overrides
        );
    }

    async testTheValidAdminContinues()
    {
        await this.test('a session of an admin with the same password revision continues', async () => {
            let validation = await this.validateSession(
                this.createAdminUserLoader({}),
                Encryptor.hashData(this.passwordHash)
            );
            this.assert.strictEqual(validation.nextCalls, 1);
            this.assert.strictEqual(validation.destroyedSessions, 0);
        });
    }

    async testTheInvalidatedUsersLoseTheSession()
    {
        await this.test('the session of a missing, banned, demoted or password changed admin is destroyed', async () => {
            let currentRevision = Encryptor.hashData(this.passwordHash);
            let changedPassword = Encryptor.encryptPassword('new-password');
            let validations = [
                await this.validateSession(async () => false, currentRevision),
                await this.validateSession(this.createAdminUserLoader({status: '0'}), currentRevision),
                await this.validateSession(this.createAdminUserLoader({role_id: 1}), currentRevision),
                await this.validateSession(this.createAdminUserLoader({password: changedPassword}), currentRevision)
            ];
            for(let validation of validations){
                this.assert.strictEqual(validation.nextCalls, 0);
                this.assert.strictEqual(validation.destroyedSessions, 1);
                this.assert.deepStrictEqual(validation.redirects, [this.loginPath]);
            }
        });
    }

    async testTheStorageErrorRedirectsToTheLogin()
    {
        await this.test('a storage error while validating the session redirects to the login', async () => {
            let validation = await this.validateSession(
                async () => Promise.reject({message: 'Storage.'}),
                Encryptor.hashData(this.passwordHash)
            );
            this.assert.strictEqual(validation.nextCalls, 0);
            this.assert.strictEqual(validation.destroyedSessions, 0);
            this.assert.deepStrictEqual(validation.redirects, [this.loginPath]);
        });
    }

    async validateBlacklistedPath(referer)
    {
        return await this.validateSession(
            this.createAdminUserLoader({}),
            Encryptor.hashData(this.passwordHash),
            {host: 'game.test', referer},
            {[this.adminRoleId]: ['/users']}
        );
    }

    async testTheBlacklistedPathReturnsToTheLocalReferer()
    {
        await this.test('a blacklisted path redirects back to a same host referer inside the panel', async () => {
            let validation = await this.validateBlacklistedPath('http://game.test/reldens-admin/rooms?page=2');
            this.assert.strictEqual(validation.nextCalls, 0);
            this.assert.deepStrictEqual(validation.redirects, ['/reldens-admin/rooms?page=2']);
        });
    }

    async testTheBlacklistedPathNeverRedirectsOutsideThePanel()
    {
        await this.test('a blacklisted path ignores external, outside the panel and invalid referers', async () => {
            let referers = ['https://attacker.test/reldens-admin', 'http://game.test/other-page', 'not a url', ''];
            for(let referer of referers){
                let validation = await this.validateBlacklistedPath(referer);
                this.assert.deepStrictEqual(validation.redirects, [this.loginPath], referer);
            }
        });
    }

}

module.exports.TestAdminSessionValidator = TestAdminSessionValidator;
