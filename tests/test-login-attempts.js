/**
 *
 * Reldens - Test Login Attempts
 *
 */

const { BaseTest } = require('./base-test');
const { LoginAttempts } = require('../lib/game/server/memory/login-attempts');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestLoginAttempts extends BaseTest
{

    createIpListsRepository(storedRows)
    {
        let ipListsRepository = {createdRows: [], updatedRows: []};
        ipListsRepository.loadBy = async (field, value) => storedRows.filter((storedRow) => value === storedRow[field]);
        ipListsRepository.loadOne = async (filters) => storedRows.find((storedRow) => {
            return filters.address === storedRow.address && filters.list_type === storedRow.list_type;
        });
        ipListsRepository.create = async (rowData) => ipListsRepository.createdRows.push(rowData);
        ipListsRepository.updateById = async (id, rowData) => ipListsRepository.updatedRows.push({id, rowData});
        return ipListsRepository;
    }

    async testOnlyTheActiveTemporaryBlocksAreRestored()
    {
        await this.test('only the stored temporary deny rows not expired are restored as login blocks', async () => {
            let now = Date.now();
            let loginAttempts = new LoginAttempts({ipListsRepository: this.createIpListsRepository([
                {id: 1, address: '10.0.0.1', list_type: 'deny', expires_at: new Date(now+60000)},
                {id: 2, address: '10.0.0.2', list_type: 'deny', expires_at: new Date(now-60000)},
                {id: 3, address: '10.0.0.3', list_type: 'deny', expires_at: null},
                {id: 4, address: '10.0.0.4', list_type: 'allow', expires_at: new Date(now+60000)}
            ])});
            this.assert.strictEqual(await loginAttempts.restoreAddressBlocks(now), 1);
            let addressKeyPrefix = GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS;
            this.assert.strictEqual(loginAttempts.isBlocked(addressKeyPrefix+'10.0.0.1', now), true);
            this.assert.strictEqual(loginAttempts.isBlocked(addressKeyPrefix+'10.0.0.2', now), false);
            this.assert.strictEqual(loginAttempts.isBlocked(addressKeyPrefix+'10.0.0.3', now), false);
            this.assert.strictEqual(loginAttempts.isBlocked(addressKeyPrefix+'10.0.0.4', now), false);
        });
    }

    async testTheRestoredBlockEndsAtTheStoredExpiration()
    {
        await this.test('a restored login block ends at the stored expiration instead of being permanent', async () => {
            let now = Date.now();
            let expiresAt = new Date(now+60000);
            let loginAttempts = new LoginAttempts({ipListsRepository: this.createIpListsRepository([
                {id: 1, address: '10.0.0.1', list_type: 'deny', expires_at: expiresAt}
            ])});
            await loginAttempts.restoreAddressBlocks(now);
            let addressKey = GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS+'10.0.0.1';
            this.assert.strictEqual(loginAttempts.isBlocked(addressKey, expiresAt.getTime()-1), true);
            this.assert.strictEqual(loginAttempts.isBlocked(addressKey, expiresAt.getTime()), false);
        });
    }

    async testTheNewAddressBlockIsStoredWithItsExpiration()
    {
        await this.test('a new address block is stored as a deny row with the block expiration', async () => {
            let ipListsRepository = this.createIpListsRepository([]);
            let loginAttempts = new LoginAttempts({ipListsRepository});
            let blockedUntil = Date.now()+900000;
            let addressKey = GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS+'10.0.0.1';
            this.assert.strictEqual(await loginAttempts.persistAddressBlock(addressKey, blockedUntil), true);
            this.assert.strictEqual(ipListsRepository.createdRows.length, 1);
            this.assert.strictEqual(ipListsRepository.updatedRows.length, 0);
            let createdRow = [...ipListsRepository.createdRows].shift();
            this.assert.strictEqual(createdRow.address, '10.0.0.1');
            this.assert.strictEqual(createdRow.list_type, 'deny');
            this.assert.strictEqual(createdRow.expires_at, sc.formatDate(new Date(blockedUntil)));
        });
    }

    async testTheRepeatedAddressBlockUpdatesTheStoredRow()
    {
        await this.test('a repeated temporary address block updates the stored row, not a duplicate', async () => {
            let ipListsRepository = this.createIpListsRepository([
                {id: 7, address: '10.0.0.1', list_type: 'deny', expires_at: new Date(Date.now()-60000)}
            ]);
            let loginAttempts = new LoginAttempts({ipListsRepository});
            let blockedUntil = Date.now()+900000;
            let addressKey = GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS+'10.0.0.1';
            this.assert.strictEqual(await loginAttempts.persistAddressBlock(addressKey, blockedUntil), true);
            this.assert.strictEqual(ipListsRepository.createdRows.length, 0);
            this.assert.strictEqual(ipListsRepository.updatedRows.length, 1);
            let updatedRow = [...ipListsRepository.updatedRows].shift();
            this.assert.strictEqual(updatedRow.id, 7);
            this.assert.strictEqual(updatedRow.rowData.expires_at, sc.formatDate(new Date(blockedUntil)));
        });
    }

    async testThePermanentDenyRowIsNotReplacedByATemporaryBlock()
    {
        await this.test('a permanent deny row is not replaced by a temporary login block', async () => {
            let ipListsRepository = this.createIpListsRepository([
                {id: 7, address: '10.0.0.1', list_type: 'deny', expires_at: null}
            ]);
            let loginAttempts = new LoginAttempts({ipListsRepository});
            let addressKey = GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS+'10.0.0.1';
            this.assert.strictEqual(await loginAttempts.persistAddressBlock(addressKey, Date.now()+900000), false);
            this.assert.strictEqual(ipListsRepository.createdRows.length, 0);
            this.assert.strictEqual(ipListsRepository.updatedRows.length, 0);
        });
    }

    async testTheIdentityBlockIsNotStored()
    {
        await this.test('a block for a user identity is kept in memory and not stored in the IP lists', async () => {
            let ipListsRepository = this.createIpListsRepository([]);
            let loginAttempts = new LoginAttempts({ipListsRepository});
            let identityKey = GameConst.LOGIN_ATTEMPTS_KEYS.IDENTITY+'player';
            this.assert.strictEqual(await loginAttempts.persistAddressBlock(identityKey, Date.now()+900000), false);
            this.assert.strictEqual(ipListsRepository.createdRows.length, 0);
            this.assert.strictEqual(ipListsRepository.updatedRows.length, 0);
        });
    }

}

module.exports.TestLoginAttempts = TestLoginAttempts;
