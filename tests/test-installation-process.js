/**
 *
 * Reldens - Test Installation Process
 *
 */

const { InstallationBaseTest } = require('./fixtures/installation-base-test');
const { DataServerConfig } = require('../lib/game/server/data-server-config');
const { EntitiesLoader } = require('../lib/game/server/entities-loader');
const { StorageDriversResolver } = require('@reldens/cms/lib/storage-drivers-resolver');
const { EnvironmentValuesRestorer } = require('./fixtures/environment-values-restorer');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestInstallationProcess extends InstallationBaseTest
{

    async testInstallerDefaultsToTheKnexStorageDriver()
    {
        await this.test('the installer defaults to the knex storage driver and lists every driver', async () => {
            let previousEnvironment = EnvironmentValuesRestorer.capture(['RELDENS_STORAGE_DRIVER', 'RELDENS_DB_CLIENT']);
            delete process.env.RELDENS_STORAGE_DRIVER;
            delete process.env.RELDENS_DB_CLIENT;
            let installer = this.createInstaller();
            let defaults = installer.fetchDefaults();
            let options = installer.storageDriversOptions(defaults['db-storage-driver']);
            let dbConfig = DataServerConfig.prepareDbConfig({user: this.config.dbUser, database: this.config.dbName});
            EnvironmentValuesRestorer.restore(previousEnvironment);
            FileHandler.remove(this.installProjectRoot);
            let availableKeys = StorageDriversResolver.available(this.installProjectRoot, installer.prismaAdapter)
                .map(driver => driver.key);
            this.assert.strictEqual(defaults['db-storage-driver'], 'knex');
            this.assert.strictEqual(defaults['db-client'], 'mysql2');
            this.assert.strictEqual(dbConfig.storageDriver, 'knex');
            this.assert.strictEqual([...options].shift().key, 'knex');
            this.assert.strictEqual([...options].shift().selected, ' selected="selected"');
            this.assert.deepStrictEqual(
                options.map(option => option.key),
                StorageDriversResolver.drivers().map(driver => driver.key)
            );
            let labelsToInstall = options.filter(option => !availableKeys.includes(option.key))
                .map(option => option.label.endsWith(installer.driverToInstallLabel));
            this.assert.strictEqual(labelsToInstall.every(endsWithLabel => endsWithLabel), true);
        });
    }

    async testInstallerDefaultsToTheNoneMailerService()
    {
        await this.test('the installer selects the none mailer service by default', async () => {
            let installer = this.createInstaller();
            let defaults = installer.fetchDefaults();
            FileHandler.remove(this.installProjectRoot);
            this.assert.strictEqual(defaults['mailer-service-none'], ' selected="selected"');
            this.assert.strictEqual(sc.hasOwn(defaults, 'mailer-service-nodemailer'), false);
            this.assert.strictEqual(defaults['mailer-secure-checked'], ' checked="checked"');
        });
    }

    async testInstallerEnablesTheMailerOnlyForASelectedService()
    {
        await this.test('the installer enables the mailer for nodemailer and sendgrid and disables it for none', async () => {
            let installer = this.createInstaller();
            let expectedEnable = {nodemailer: '1', sendgrid: '1', none: '0'};
            let resultEnable = {};
            for(let mailerService of Object.keys(expectedEnable)){
                let templateVariables = {'mailer-service': mailerService};
                installer.setSelectedOptions(templateVariables);
                resultEnable[mailerService] = templateVariables['mailer-enable'];
            }
            FileHandler.remove(this.installProjectRoot);
            this.assert.deepStrictEqual(resultEnable, expectedEnable);
        });
    }

    async testInstallerAcceptsTheNoneAndTheInstalledMailerServices()
    {
        await this.test('the installer accepts no mailer and the installed nodemailer package', async () => {
            let installer = this.createInstaller();
            let noneAvailable = installer.isMailerServiceAvailable('none');
            let nodemailerAvailable = installer.isMailerServiceAvailable('nodemailer');
            FileHandler.remove(this.installProjectRoot);
            this.assert.strictEqual(noneAvailable, true);
            this.assert.strictEqual(nodemailerAvailable, true);
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

    async testTheFirstLaunchServesTheInstallerFormWithTheEnvironmentDefaults()
    {
        await this.test('the first launch serves the installer form with the defaults from the environment', async () => {
            let previousEnvironment = EnvironmentValuesRestorer.capture(['RELDENS_DB_HOST']);
            process.env.RELDENS_DB_HOST = 'installer-env-db-host';
            let installer = this.createInstaller();
            installer.themeManager.installerPathIndex = FileHandler.joinPaths(this.projectRoot, 'install', 'index.html');
            let sentPages = [];
            let nextCalls = [];
            await installer.executeForEveryRequest(
                () => nextCalls.push('next'),
                {path: '/', session: {}},
                {send: (page) => sentPages.push(page)}
            );
            EnvironmentValuesRestorer.restore(previousEnvironment);
            FileHandler.remove(this.installProjectRoot);
            this.assert.deepStrictEqual(
                [sentPages.length, nextCalls, sentPages.join('').includes('value="installer-env-db-host"')],
                [1, [], true],
                'The not installed project serves the installer form with the environment database host'
            );
        });
    }

    async runFailedPackagesInstall(prepareInstaller, packagesInstallation)
    {
        let installer = this.createInstaller();
        prepareInstaller(installer);
        let response = this.createInstallResponse();
        let installRequest = this.createInstallRequest('knex');
        installRequest.body['app-allow-packages-installation'] = packagesInstallation;
        await installer.executeInstallProcess(installRequest, response);
        let lockExists = FileHandler.exists(FileHandler.joinPaths(this.installProjectRoot, 'install.lock'));
        FileHandler.remove(this.installProjectRoot);
        return [response.redirectUrl, lockExists];
    }

    async testTheMissingPackagesAnswerTheirErrorBeforeTheDatabaseWork()
    {
        await this.test('a failed packages install or missing driver or mailer packages answer their error', async () => {
            this.assert.deepStrictEqual(await this.runFailedPackagesInstall((installer) => {
                installer.packagesInstallation = {unlinkAllPackages: () => true, checkAndInstallPackages: () => false};
            }, '1'), ['/?error=installation-dependencies-failed', false]);
            this.assert.deepStrictEqual(await this.runFailedPackagesInstall((installer) => {
                installer.isStorageDriverAvailable = () => false;
            }, '0'), ['/?error=driver-packages-missing', false]);
            this.assert.deepStrictEqual(await this.runFailedPackagesInstall((installer) => {
                installer.isMailerServiceAvailable = () => false;
            }, '0'), ['/?error=mailer-packages-missing', false]);
        });
    }

    async testInstallerRejectsAnUnknownStorageDriver()
    {
        await this.test('the installer rejects an unknown or missing storage driver before creating any project file', async () => {
            let expectedRedirects = {'not-a-driver': '/?error=invalid-driver', '': '/?error=missing-storage-driver'};
            for(let storageDriver of Object.keys(expectedRedirects)){
                let installer = this.createInstaller();
                let response = this.createInstallResponse();
                await installer.executeInstallProcess(this.createInstallRequest(storageDriver), response);
                let lockExists = FileHandler.exists(FileHandler.joinPaths(this.installProjectRoot, 'install.lock'));
                FileHandler.remove(this.installProjectRoot);
                this.assert.strictEqual(response.redirectUrl, expectedRedirects[storageDriver]);
                this.assert.strictEqual(lockExists, false);
            }
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
            let servedStatuses = [];
            let writeInstallStatus = installer.updateInstallStatus.bind(installer);
            installer.updateInstallStatus = (message) => {
                writeInstallStatus(message);
                servedStatuses.push(sc.get(sc.parseJson(FileHandler.readFile(installer.statusFilePath)), 'message', ''));
            };
            await installer.executeInstallProcess(this.createInstallRequest('knex'), response);
            this.assert.strictEqual(response.redirectUrl, 'http://localhost:8080');
            this.assert.deepStrictEqual(servedStatuses, [
                'Starting installation process...',
                'Configuring database connection...',
                'Installing database driver: knex...',
                'Generating entities from database schema...',
                'Creating project files...',
                'Installation completed successfully!'
            ], 'The status file served by /install-status.json holds each installation step');
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
            let installedResponse = this.createInstallResponse();
            await installer.executeInstallProcess(this.createInstallRequest('knex'), installedResponse);
            let nextCalls = [];
            await installer.executeForEveryRequest(() => nextCalls.push('next'), {path: '/'}, installedResponse);
            FileHandler.remove(this.installProjectRoot);
            this.assert.deepStrictEqual(
                [installedResponse.redirectUrl, nextCalls],
                ['/?redirect=already-installed', ['next']],
                'The installed project redirects a new install to already-installed and no longer serves the form'
            );
        });
    }

}

module.exports.TestInstallationProcess = TestInstallationProcess;
