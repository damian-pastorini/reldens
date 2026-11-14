/**
 *
 * Reldens - Test Login Attempts
 *
 */

const { BaseTest } = require('./base-test');
const { LoginAttempts } = require('../lib/game/server/memory/login-attempts');
const { GameConst } = require('../lib/game/constants');
const { AppServerFactory } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestLoginAttempts extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.addressKeyGenerator = new AppServerFactory().rateLimitConfigurer.rateLimit.ipKeyGenerator;
    }

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

    async testTheIdentityAndTheAddressAreBlockedAfterTheMaximumFailures()
    {
        await this.test('the identity and the address are blocked after the maximum login failures', async () => {
            let loginAttempts = new LoginAttempts({maxAttempts: 2});
            let now = Date.now();
            loginAttempts.registerLoginFailure('player', '10.0.0.1', now);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('player', '', now), false);
            loginAttempts.registerLoginFailure('player', '10.0.0.1', now);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('player', '', now), true);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('another-player', '10.0.0.1', now), true);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('another-player', '10.0.0.2', now), false);
        });
    }

    async testTheAddressLimitIsReachedAboveTheMaximum()
    {
        await this.test('the address limit is reached above the maximum and ignored without an address', async () => {
            let loginAttempts = new LoginAttempts({});
            let now = Date.now();
            let registrationKey = GameConst.LOGIN_ATTEMPTS_KEYS.REGISTRATION;
            this.assert.strictEqual(loginAttempts.isAddressLimitReached(registrationKey, '10.0.0.1', 1, now), false);
            this.assert.strictEqual(loginAttempts.isAddressLimitReached(registrationKey, '10.0.0.1', 1, now), true);
            this.assert.strictEqual(loginAttempts.isAddressLimitReached(registrationKey, '', 1, now), false);
            this.assert.strictEqual(loginAttempts.isAddressLimitReached(registrationKey, '10.0.0.2', 0, now), false);
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

    async testTheExpiredKeysOfOtherIdentitiesAreSwept()
    {
        await this.test('a hit after a full window sweeps the expired hits and blocks of the other keys', async () => {
            let loginAttempts = new LoginAttempts({maxAttempts: 1, blockTimeMs: 1000, windowMs: 1000});
            let now = Date.now();
            loginAttempts.registerHit(GameConst.LOGIN_ATTEMPTS_KEYS.JOINS+'10.0.0.1', now);
            loginAttempts.registerLoginFailure('blocked-player', '', now);
            this.assert.strictEqual(loginAttempts.hitsByKey.size, 1);
            this.assert.strictEqual(loginAttempts.blockedUntilByKey.size, 1);
            loginAttempts.registerHit(GameConst.LOGIN_ATTEMPTS_KEYS.JOINS+'10.0.0.2', now+2000);
            this.assert.deepStrictEqual(
                [...loginAttempts.hitsByKey.keys()],
                [GameConst.LOGIN_ATTEMPTS_KEYS.JOINS+'10.0.0.2']
            );
            this.assert.strictEqual(loginAttempts.blockedUntilByKey.size, 0);
        });
    }

    async testTheOldestKeyIsEvictedAtTheTrackedKeysCap()
    {
        await this.test('the oldest tracked key is evicted when the tracked keys cap is reached', async () => {
            let loginAttempts = new LoginAttempts({maxTrackedKeys: 2});
            let now = Date.now();
            let joinsKeyPrefix = GameConst.LOGIN_ATTEMPTS_KEYS.JOINS;
            loginAttempts.registerHit(joinsKeyPrefix+'10.0.0.1', now);
            loginAttempts.registerHit(joinsKeyPrefix+'10.0.0.2', now);
            loginAttempts.registerHit(joinsKeyPrefix+'10.0.0.3', now);
            this.assert.deepStrictEqual(
                [...loginAttempts.hitsByKey.keys()],
                [joinsKeyPrefix+'10.0.0.2', joinsKeyPrefix+'10.0.0.3']
            );
        });
    }

    async testTheLongIdentitiesAreTruncatedInTheKeys()
    {
        await this.test('an identity longer than the maximum length is truncated in the attempts key', async () => {
            let loginAttempts = new LoginAttempts({maxAttempts: 1, maxIdentityLength: 10});
            let now = Date.now();
            loginAttempts.registerLoginFailure('x'.repeat(5000), '', now);
            this.assert.deepStrictEqual(
                [...loginAttempts.blockedUntilByKey.keys()],
                [GameConst.LOGIN_ATTEMPTS_KEYS.IDENTITY+'x'.repeat(10)]
            );
            this.assert.strictEqual(loginAttempts.isLoginBlocked('x'.repeat(20), '', now), true);
        });
    }

    async testTheIdentityLetterCaseVariantsShareTheAttempts()
    {
        await this.test('the letter case variants of an identity share the login attempts and the block', async () => {
            let loginAttempts = new LoginAttempts({maxAttempts: 2});
            let now = Date.now();
            loginAttempts.registerLoginFailure('Player', '', now);
            loginAttempts.registerLoginFailure('PLAYER', '', now);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('player', '', now), true);
        });
    }

    async testTheMappedAndTheSameNetworkAddressesShareTheAttempts()
    {
        await this.test('an IPv4 mapped address and the addresses of one IPv6 network share the attempts', async () => {
            let loginAttempts = new LoginAttempts({maxAttempts: 2, addressKeyGenerator: this.addressKeyGenerator});
            let now = Date.now();
            loginAttempts.registerLoginFailure('first-player', '::ffff:10.0.0.1', now);
            loginAttempts.registerLoginFailure('second-player', '10.0.0.1', now);
            loginAttempts.registerLoginFailure('third-player', '2001:db8:0:1::1', now);
            loginAttempts.registerLoginFailure('fourth-player', '2001:db8:0:2::2', now);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('another-player', '10.0.0.1', now), true);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('another-player', '2001:db8:0:3::3', now), true);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('another-player', '2001:db8:1::1', now), false);
        });
    }

    async testTheAddressLimitsCountTheMappedAddressAsItsIpv4Address()
    {
        await this.test('the address limits count an IPv4 mapped address as its IPv4 address', async () => {
            let loginAttempts = new LoginAttempts({addressKeyGenerator: this.addressKeyGenerator});
            let now = Date.now();
            let registrationKey = GameConst.LOGIN_ATTEMPTS_KEYS.REGISTRATION;
            this.assert.strictEqual(
                loginAttempts.isAddressLimitReached(registrationKey, '::ffff:10.0.0.5', 1, now),
                false
            );
            this.assert.strictEqual(loginAttempts.isAddressLimitReached(registrationKey, '10.0.0.5', 1, now), true);
        });
    }

    async testTheStoredAddressBlocksUseTheAddressKeys()
    {
        await this.test('the address blocks are stored and restored with the address keys', async () => {
            let now = Date.now();
            let ipListsRepository = this.createIpListsRepository([
                {id: 1, address: '::ffff:10.0.0.9', list_type: 'deny', expires_at: new Date(now+60000)}
            ]);
            let loginAttempts = new LoginAttempts({ipListsRepository, addressKeyGenerator: this.addressKeyGenerator});
            await loginAttempts.restoreAddressBlocks(now);
            await loginAttempts.persistAddressBlock(loginAttempts.addressKey('2001:db8:0:1::1'), now+900000);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('player', '10.0.0.9', now), true);
            this.assert.strictEqual([...ipListsRepository.createdRows].shift().address, '2001:db8::/56');
        });
    }

}

module.exports.TestLoginAttempts = TestLoginAttempts;
