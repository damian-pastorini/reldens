/**
 *
 * Reldens - Test Admin Password Fields
 *
 */

const { BaseTest } = require('./base-test');
const { PasswordEncryptionHandler } = require('@reldens/cms/lib/password-encryption-handler');
const { RouterContents } = require('@reldens/cms/lib/admin-manager/router-contents');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TestAdminPasswordFields extends BaseTest
{

    preparePatch(requestBody, entityId)
    {
        let routerContents = Object.create(RouterContents.prototype);
        routerContents.passwordFieldNames = ['password'];
        return routerContents.preparePatchData(
            {entityKey: 'users', options: {editProperties: ['password', 'status']}},
            'id',
            {body: requestBody},
            {id: {type: 'number'}, password: {type: 'string', isRequired: true}, status: {type: 'string'}},
            entityId,
            null
        );
    }

    async testAHashShapedPasswordIsHashedAgain()
    {
        await this.test('a submitted password shaped like a stored hash is hashed like any password', async () => {
            let hashShapedPassword = Encryptor.encryptPassword('another-password');
            let request = {body: {password: hashShapedPassword}};
            let passwordHandler = new PasswordEncryptionHandler({events: {on: () => true}});
            await passwordHandler.handleBeforeEntitySave({driverResource: {entityKey: 'users'}, req: request});
            this.assert.notStrictEqual(request.body.password, hashShapedPassword);
            this.assert.strictEqual(await Encryptor.validatePassword(hashShapedPassword, request.body.password), true);
        });
    }

    async testABlankPasswordOnUpdateKeepsTheStoredHash()
    {
        await this.test('a blank required password on an update is skipped so the stored hash is kept', async () => {
            this.assert.deepStrictEqual(this.preparePatch({password: '', status: '1'}, '5'), {status: '1'});
        });
    }

    async testABlankPasswordOnCreateIsRejected()
    {
        await this.test('a blank required password on a create is rejected', async () => {
            this.assert.strictEqual(this.preparePatch({password: '', status: '1'}, ''), false);
        });
    }

    async saveWithCapturedLogs(passwordHash, updateById)
    {
        let routerContents = Object.create(RouterContents.prototype);
        routerContents.rootPath = '/reldens-admin';
        routerContents.editPath = '/edit';
        routerContents.passwordFieldNames = ['password'];
        routerContents.fetchEntityIdPropertyKey = () => 'id';
        routerContents.fetchUploadProperties = () => ({});
        routerContents.loadEntityById = async () => ({id: 5, password: 'stored-hash'});
        routerContents.dataServer = {getEntity: () => ({updateById})};
        let loggedArguments = [];
        let previousCallback = Logger.callback;
        let previousLevels = Logger.activeLogLevels;
        Logger.activeLogLevels = [4];
        Logger.callback = (...args) => loggedArguments.push(sc.toJsonString(args));
        try {
            await routerContents.processSaveEntity(
                {body: {id: '5', password: passwordHash, status: '1'}},
                {},
                {
                    entityKey: 'users',
                    entityPath: 'users',
                    options: {
                        editProperties: ['password', 'status'],
                        properties: {id: {type: 'number'}, password: {type: 'string'}, status: {type: 'string'}}
                    }
                },
                'users'
            );
        } finally {
            Logger.callback = previousCallback;
            Logger.activeLogLevels = previousLevels;
        }
        return loggedArguments.join(' ');
    }

    async testTheFailedSaveResultDoesNotLogThePassword()
    {
        await this.test('a failed users save logs the patched fields but not the password hash', async () => {
            let passwordHash = Encryptor.encryptPassword('submitted-password');
            let loggedText = await this.saveWithCapturedLogs(passwordHash, async () => false);
            this.assert.strictEqual(-1 !== loggedText.indexOf('Save result error.'), true);
            this.assert.strictEqual(-1 !== loggedText.indexOf('"password"'), true);
            this.assert.strictEqual(-1 === loggedText.indexOf(passwordHash), true);
        });
    }

    async testTheStorageErrorDoesNotLogTheCompiledQuery()
    {
        await this.test('a storage error on a users save logs the error code without the compiled query', async () => {
            let passwordHash = Encryptor.encryptPassword('submitted-password');
            let loggedText = await this.saveWithCapturedLogs(passwordHash, async () => Promise.reject({
                message: 'update `users` set `password` = \''+passwordHash+'\' - Data too long',
                code: 'ER_DATA_TOO_LONG',
                sqlMessage: 'Data too long for column'
            }));
            this.assert.strictEqual(-1 !== loggedText.indexOf('ER_DATA_TOO_LONG'), true);
            this.assert.strictEqual(-1 === loggedText.indexOf(passwordHash), true);
        });
    }

}

module.exports.TestAdminPasswordFields = TestAdminPasswordFields;
