/**
 *
 * Reldens - Test Firebase Legacy Passwords Migration
 *
 */

const { BaseTest } = require('./base-test');
const { FirebaseLegacyPasswordsMigration } = require('../lib/firebase/server/firebase-legacy-passwords-migration');
const { FirebaseIdTokenVerifier } = require('../lib/firebase/server/firebase-id-token-verifier');
const { Encryptor, FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestFirebaseLegacyPasswordsMigration extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.passwordSecret = 'test-password-secret';
        this.exportFilePath = FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'firebase-auth-export.json');
    }

    createMigrationSetup()
    {
        let migrationSetup = {
            storedUsers: {
                'legacy@test.com': {id: 1, email: 'legacy@test.com', password: Encryptor.encryptPassword('legacy-uid')},
                'changed@test.com': {id: 2, email: 'changed@test.com', password: Encryptor.encryptPassword('own')}
            },
            updates: []
        };
        migrationSetup.migration = new FirebaseLegacyPasswordsMigration({
            usersRepository: {
                loadOneBy: async (field, email) => sc.get(migrationSetup.storedUsers, email, false),
                updateById: async (userId, updatePatch) => {
                    migrationSetup.updates.push({userId, updatePatch});
                    return true;
                }
            },
            idTokenVerifier: new FirebaseIdTokenVerifier({passwordSecret: this.passwordSecret})
        });
        return migrationSetup;
    }

    async testTheLegacyUidPasswordIsReplacedByTheDerivedPassword()
    {
        await this.test('the stored hash of the Firebase uid is replaced by the derived password hash', async () => {
            let migrationSetup = this.createMigrationSetup();
            let migratedUsers = await migrationSetup.migration.migrate(this.exportFilePath);
            this.assert.strictEqual(migratedUsers, 1);
            this.assert.strictEqual(migrationSetup.updates.length, 1);
            let migratedUpdate = [...migrationSetup.updates].shift();
            let migratedHash = migratedUpdate.updatePatch.password;
            let derivedPassword = Encryptor.generateHMAC('legacy-uid', this.passwordSecret);
            this.assert.strictEqual(migratedUpdate.userId, 1);
            this.assert.strictEqual(await Encryptor.validatePassword(derivedPassword, migratedHash), true);
            this.assert.strictEqual(await Encryptor.validatePassword('legacy-uid', migratedHash), false);
        });
    }

    async testTheNonMatchingAndUnknownUsersAreNotChanged()
    {
        await this.test('the users with another password and the unknown users are not changed', async () => {
            let migrationSetup = this.createMigrationSetup();
            await migrationSetup.migration.migrate(this.exportFilePath);
            this.assert.deepStrictEqual(migrationSetup.updates.map((update) => update.userId), [1]);
        });
    }

    async testAMissingExportFileFailsWithoutChanges()
    {
        await this.test('a missing export file returns false without changing users', async () => {
            let migrationSetup = this.createMigrationSetup();
            let missingPath = FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'missing-export.json');
            this.assert.strictEqual(await migrationSetup.migration.migrate(missingPath), false);
            this.assert.strictEqual(migrationSetup.updates.length, 0);
        });
    }

}

module.exports.TestFirebaseLegacyPasswordsMigration = TestFirebaseLegacyPasswordsMigration;
