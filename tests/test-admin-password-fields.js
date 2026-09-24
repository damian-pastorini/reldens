/**
 *
 * Reldens - Test Admin Password Fields
 *
 */

const { BaseTest } = require('./base-test');
const { PasswordEncryptionHandler } = require('@reldens/cms/lib/password-encryption-handler');
const { RouterContents } = require('@reldens/cms/lib/admin-manager/router-contents');
const { Encryptor } = require('@reldens/server-utils');

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

}

module.exports.TestAdminPasswordFields = TestAdminPasswordFields;
