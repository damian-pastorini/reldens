/**
 *
 * Reldens - Test Installation Process
 *
 */

const { BaseTest } = require('./base-test');
const { Installer } = require('../lib/game/server/installer');
const { ThemeManager } = require('../lib/game/server/theme-manager');
const { DataServerConfig } = require('../lib/game/server/data-server-config');
const { EntitiesLoader } = require('../lib/game/server/entities-loader');
const { StorageDriversResolver } = require('@reldens/cms/lib/storage-drivers-resolver');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestInstallationProcess extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.projectRoot = process.cwd();
        this.installProjectRoot = FileHandler.joinPaths(this.projectRoot, 'test-results', 'installer-project');
        this.startCallbackProps = false;
    }

    createInstaller()
    {
        FileHandler.remove(this.installProjectRoot);
        FileHandler.createFolder(this.installProjectRoot);
        return new Installer({
            themeManager: new ThemeManager({projectRoot: this.installProjectRoot, reldensModulePath: this.projectRoot}),
            startCallback: async (props) => {
                this.startCallbackProps = props;
            }
        });
    }

    createInstallRequest(storageDriver)
    {
        return {
            session: {},
            body: {
                'app-host': 'http://localhost',
                'app-port': '8080',
                'app-public-url': 'http://localhost:8080',
                'app-trusted-proxy': '',
                'app-admin-path': '/reldens-admin',
                'app-admin-secret': 'installer-test-secret',
                'app-signed-tokens-secret': 'installer-test-signed-tokens-secret',
                'db-storage-driver': storageDriver,
                'db-client': 'mysql2',
                'db-host': this.config.dbHost,
                'db-port': this.config.dbPort,
                'db-name': this.config.dbName,
                'db-username': this.config.dbUser,
                'db-password': this.config.dbPassword,
                'mailer-service': 'nodemailer'
            }
        };
    }

    createInstallResponse()
    {
        let response = {redirectUrl: ''};
        response.redirect = (url) => {
            response.redirectUrl = url;
            return response;
        };
        return response;
    }

    restoreEnvironment(previousEnvironment)
    {
        for(let key of Object.keys(previousEnvironment)){
            if(false === previousEnvironment[key]){
                continue;
            }
            process.env[key] = previousEnvironment[key];
        }
    }

    async testInstallerDefaultsToTheKnexStorageDriver()
    {
        await this.test('the installer defaults to the knex storage driver and lists only the available drivers', async () => {
            let previousEnvironment = {
                RELDENS_STORAGE_DRIVER: sc.get(process.env, 'RELDENS_STORAGE_DRIVER', false),
                RELDENS_DB_CLIENT: sc.get(process.env, 'RELDENS_DB_CLIENT', false)
            };
            delete process.env.RELDENS_STORAGE_DRIVER;
            delete process.env.RELDENS_DB_CLIENT;
            let installer = this.createInstaller();
            let defaults = installer.fetchDefaults();
            let options = installer.storageDriversOptions(defaults['db-storage-driver']);
            let dbConfig = DataServerConfig.prepareDbConfig({user: this.config.dbUser, database: this.config.dbName});
            this.restoreEnvironment(previousEnvironment);
            FileHandler.remove(this.installProjectRoot);
            let availableKeys = StorageDriversResolver.available(this.installProjectRoot, installer.prismaAdapter)
                .map(driver => driver.key);
            this.assert.strictEqual(defaults['db-storage-driver'], 'knex');
            this.assert.strictEqual(defaults['db-client'], 'mysql2');
            this.assert.strictEqual(dbConfig.storageDriver, 'knex');
            this.assert.strictEqual([...options].shift().key, 'knex');
            this.assert.strictEqual([...options].shift().selected, ' selected="selected"');
            this.assert.strictEqual(options.every(option => availableKeys.includes(option.key)), true);
        });
    }

    async testEntitiesLoaderResolvesTheGeneratedKnexModels()
    {
        await this.test('the entities loader resolves the generated knex models', async () => {
            let modelsPath = EntitiesLoader.findGeneratedModelsPath(this.projectRoot, 'knex');
            this.assert.strictEqual(sc.isString(modelsPath), true);
            this.assert.strictEqual(modelsPath.endsWith('registered-models-knex.js'), true);
            let loadedEntities = EntitiesLoader.loadEntities({
                reldensModuleLibPath: FileHandler.joinPaths(this.projectRoot, 'lib'),
                projectRoot: this.projectRoot,
                bucketFullPath: FileHandler.joinPaths(this.projectRoot, 'theme', 'default'),
                distPath: FileHandler.joinPaths(this.projectRoot, 'dist'),
                storageDriver: 'knex',
                withConfig: true,
                withTranslations: true
            });
            let repoRegisteredModels = require(modelsPath);
            this.assert.deepStrictEqual(
                Object.keys(loadedEntities.entitiesRaw).sort(),
                Object.keys(repoRegisteredModels.rawRegisteredEntities).sort()
            );
            this.assert.strictEqual(loadedEntities.entitiesRaw.players.tableName, 'players');
        });
    }

    async testInstallerRejectsAnUnknownStorageDriver()
    {
        await this.test('the installer rejects an unknown storage driver before creating any project file', async () => {
            let installer = this.createInstaller();
            let response = this.createInstallResponse();
            await installer.executeInstallProcess(this.createInstallRequest('not-a-driver'), response);
            let lockExists = FileHandler.exists(FileHandler.joinPaths(this.installProjectRoot, 'install.lock'));
            FileHandler.remove(this.installProjectRoot);
            this.assert.strictEqual(response.redirectUrl, '/?error=invalid-driver');
            this.assert.strictEqual(lockExists, false);
        });
    }

    async testInstallerRejectsAMissingSecretBeforeTheDatabaseWork()
    {
        await this.test('the installer rejects a missing secret before the driver and database checks', async () => {
            let expectedRedirects = {
                'app-admin-secret': '/?error=db-installation-process-failed-missing-admin-secret',
                'app-signed-tokens-secret': '/?error=db-installation-process-failed-missing-signed-tokens-secret'
            };
            for(let secretField of Object.keys(expectedRedirects)){
                let installer = this.createInstaller();
                let response = this.createInstallResponse();
                let installRequest = this.createInstallRequest('not-a-driver');
                installRequest.body[secretField] = '';
                await installer.executeInstallProcess(installRequest, response);
                let lockExists = FileHandler.exists(FileHandler.joinPaths(this.installProjectRoot, 'install.lock'));
                FileHandler.remove(this.installProjectRoot);
                this.assert.strictEqual(response.redirectUrl, expectedRedirects[secretField]);
                this.assert.strictEqual(lockExists, false);
            }
        });
    }

    async testInstallerCompletesAKnexInstallation()
    {
        await this.test('the installer completes a knex installation and creates the project files', async () => {
            let installer = this.createInstaller();
            let response = this.createInstallResponse();
            await installer.executeInstallProcess(this.createInstallRequest('knex'), response);
            this.assert.strictEqual(response.redirectUrl, 'http://localhost:8080');
            let lockExists = FileHandler.exists(FileHandler.joinPaths(this.installProjectRoot, 'install.lock'));
            let gitignoreExists = FileHandler.exists(FileHandler.joinPaths(this.installProjectRoot, '.gitignore'));
            this.assert.strictEqual(lockExists, true);
            this.assert.strictEqual(gitignoreExists, true);
            let envContent = FileHandler.readFile(FileHandler.joinPaths(this.installProjectRoot, '.env'));
            this.assert.strictEqual(envContent.includes('RELDENS_STORAGE_DRIVER=knex'), true);
            this.assert.strictEqual(envContent.includes('RELDENS_DB_NAME="'+this.config.dbName+'"'), true);
            let knexFileContent = FileHandler.readFile(FileHandler.joinPaths(this.installProjectRoot, 'knexfile.js'));
            this.assert.strictEqual(knexFileContent.includes("database: '"+this.config.dbName+"'"), true);
            let generatedModels = require(FileHandler.joinPaths(
                this.installProjectRoot,
                'generated-entities',
                'models',
                'knex',
                'registered-models-knex'
            ));
            let repoPlayersModel = require(FileHandler.joinPaths(
                this.projectRoot,
                'generated-entities',
                'models',
                'knex',
                'players-model'
            ));
            this.assert.deepStrictEqual(
                generatedModels.rawRegisteredEntities.players.relationMappings.related_users,
                repoPlayersModel.PlayersModel.relationMappings.related_users
            );
            this.assert.strictEqual(sc.hasOwn(generatedModels.entitiesConfig.players.properties, 'user_id'), true);
            this.assert.strictEqual(this.startCallbackProps.dataServer.constructor.name, 'KnexDataServer');
            FileHandler.remove(this.installProjectRoot);
        });
    }

}

module.exports.TestInstallationProcess = TestInstallationProcess;
