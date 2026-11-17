/**
 *
 * Reldens - Test E2E Instance
 *
 */

const { BaseTest } = require('./base-test');
const { E2eInstance } = require('./e2e/helpers/e2e-instance');
const { FileHandler } = require('@reldens/server-utils');

class TestE2eInstance extends BaseTest
{

    async withInstance(instanceName, configPath, testCallback)
    {
        let originalInstanceName = E2eInstance.instanceName;
        let originalConfigPath = E2eInstance.configPath;
        E2eInstance.instanceName = instanceName;
        E2eInstance.configPath = configPath;
        try {
            await testCallback();
        } catch(error) {
            E2eInstance.instanceName = originalInstanceName;
            E2eInstance.configPath = originalConfigPath;
            throw error;
        }
        E2eInstance.instanceName = originalInstanceName;
        E2eInstance.configPath = originalConfigPath;
    }

    async testTheDefaultRunKeepsItsPathsAndConfig()
    {
        await this.test('the default run keeps the test-results folder, the e2e files and its config', async () => {
            await this.withInstance('', E2eInstance.configPath, async () => {
                let config = {dbName: 'reldens_tests', port: 5018};
                this.assert.strictEqual(
                    E2eInstance.resultsPath('playwright'),
                    FileHandler.joinPaths(process.cwd(), 'test-results', 'playwright')
                );
                this.assert.strictEqual(
                    E2eInstance.generatedFilePath('game-data.json'),
                    FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'game-data.json')
                );
                this.assert.strictEqual(E2eInstance.applyInstance(config), config);
                this.assert.deepStrictEqual(config, {dbName: 'reldens_tests', port: 5018});
            });
        });
    }

    async testAnInstanceUsesItsOwnFolderDatabaseAndPorts()
    {
        await this.test('an instance writes in its own folder and uses its own database and ports', async () => {
            await this.withInstance('server-3', E2eInstance.configPath, async () => {
                let config = {dbName: 'reldens_tests', port: 5018, dbUser: 'reldens'};
                let instanceFolder = FileHandler.joinPaths(process.cwd(), 'test-results', 'instances', 'server-3');
                this.assert.strictEqual(
                    E2eInstance.resultsPath('playwright'),
                    FileHandler.joinPaths(instanceFolder, 'playwright')
                );
                this.assert.strictEqual(
                    E2eInstance.generatedFilePath('server-events.jsonl'),
                    FileHandler.joinPaths(instanceFolder, 'server-events.jsonl')
                );
                this.assert.deepStrictEqual(E2eInstance.applyInstance(config), {
                    dbName: 'reldens_tests_server_3',
                    port: 5038,
                    dbUser: 'reldens',
                    instanceName: 'server-3'
                });
                this.assert.deepStrictEqual(config, {dbName: 'reldens_tests', port: 5018, dbUser: 'reldens'});
            });
        });
    }

    async testTheInstancesEntryOverridesTheInstanceConfig()
    {
        await this.test('the instances entry of the instance overrides its database, its port and any value', async () => {
            let instances = {
                'server-3': {dbName: 'reldens_other_tests', port: 6000, themeName: 'other-theme'},
                'server-4': {dbName: 'reldens_not_used'}
            };
            await this.withInstance('server-3', E2eInstance.configPath, async () => {
                let instanceConfig = E2eInstance.applyInstance({dbName: 'reldens_tests', port: 5018, instances});
                this.assert.strictEqual(instanceConfig.dbName, 'reldens_other_tests');
                this.assert.strictEqual(instanceConfig.port, 6000);
                this.assert.strictEqual(instanceConfig.themeName, 'other-theme');
                this.assert.strictEqual(instanceConfig.instanceName, 'server-3');
            });
        });
    }

    async testAnInstanceWithoutAConfiguredPortUsesTheDefaultPortOffset()
    {
        await this.test('an instance without a configured port starts from the default port plus the offset', async () => {
            await this.withInstance('server-3', E2eInstance.configPath, async () => {
                this.assert.strictEqual(E2eInstance.applyInstance({dbName: 'reldens_tests'}).port, 8080+20);
                this.assert.strictEqual(E2eInstance.applyInstance(null), null);
            });
        });
    }

    async testTheConfigIsLoadedWithTheInstanceApplied()
    {
        await this.test('the config file is loaded with the instance applied and a missing file gives null', async () => {
            let configTemplatePath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json.dist');
            let configTemplate = FileHandler.fetchFileJson(configTemplatePath);
            await this.withInstance('server-3', configTemplatePath, async () => {
                let instanceConfig = E2eInstance.loadConfig();
                this.assert.strictEqual(instanceConfig.dbName, configTemplate.dbName+'_server_3');
                this.assert.strictEqual(instanceConfig.port, Number(configTemplate.port)+20);
                this.assert.strictEqual(instanceConfig.serverPath, configTemplate.serverPath);
            });
            let missingConfigPath = FileHandler.joinPaths(process.cwd(), 'tests', 'missing-e2e-config.json');
            await this.withInstance('server-3', missingConfigPath, async () => {
                this.assert.strictEqual(E2eInstance.loadConfig(), null);
            });
        });
    }

}

module.exports.TestE2eInstance = TestE2eInstance;
