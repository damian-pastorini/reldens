/**
 *
 * Reldens - Test Installation Failures
 *
 * Tests the installer failures after the form checks, on a new project folder in test-results: wrong database
 * credentials answer connection-failed, an entities generation that fails answers entities-generation-failed and a
 * project files creation that fails (the env template missing) answers installation-process-failed, each one with the
 * install status left on its own step and without any project file (env, gitignore, knexfile or install lock); and an
 * installation without the sample data empties the sample assets folders (audio, actions, groups, items, rewards and
 * maps) of the theme and dist assets and removes every sprite but the player base, while with the sample data they
 * stay. The database installation and the entities generation are replaced by their results where they are not the
 * tested step.
 *
 */

const { InstallationBaseTest } = require('./fixtures/installation-base-test');
const { GameConst } = require('../lib/game/constants');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestInstallationFailures extends InstallationBaseTest
{

    constructor(config)
    {
        super(config);
        this.projectFiles = ['.env', '.gitignore', 'knexfile.js', 'install.lock'];
        this.sampleAssetsFiles = [
            ['audio', 'sample.mp3'],
            ['maps', 'sample.json'],
            ['custom', 'items', 'sample.png'],
            ['custom', 'sprites', GameConst.IMAGE_PLAYER_BASE],
            ['custom', 'sprites', 'sample-sprite.png']
        ];
    }

    async runInstall(prepareInstaller, requestValues)
    {
        let installer = this.createInstaller();
        prepareInstaller(installer);
        let response = this.createInstallResponse();
        let installRequest = this.createInstallRequest('knex');
        Object.assign(installRequest.body, requestValues);
        await installer.executeInstallProcess(installRequest, response);
        return {
            installer,
            redirect: response.redirectUrl,
            status: sc.get(sc.parseJson(FileHandler.readFile(installer.statusFilePath)), 'message', ''),
            projectFiles: this.projectFiles.filter(
                fileName => FileHandler.exists(FileHandler.joinPaths(this.installProjectRoot, fileName))
            )
        };
    }

    stubDatabaseInstallation(installer, entitiesGenerated)
    {
        installer.genericDriverInstallation.executeInstallation = async () => ({
            success: true,
            dbDriver: {disconnect: async () => true}
        });
        installer.entitiesInstallation.generateEntities = async () => entitiesGenerated;
    }

    async testWrongDatabaseCredentialsAnswerTheConnectionError()
    {
        await this.test('wrong database credentials answer connection-failed without any project file', async () => {
            let result = await this.runInstall(() => true, {'db-password': 'wrong-installer-password'});
            FileHandler.remove(this.installProjectRoot);
            this.assert.deepStrictEqual(
                [result.redirect, result.status, result.projectFiles],
                ['/?error=connection-failed', 'Installing database driver: knex...', []]
            );
        });
    }

    async testAFailedEntitiesGenerationAnswersItsError()
    {
        await this.test('a failed entities generation answers entities-generation-failed without any project file', async () => {
            let result = await this.runInstall((installer) => this.stubDatabaseInstallation(installer, false), {});
            FileHandler.remove(this.installProjectRoot);
            this.assert.deepStrictEqual(
                [result.redirect, result.status, result.projectFiles],
                ['/?error=entities-generation-failed', 'Generating entities from database schema...', []]
            );
        });
    }

    async testAFailedProjectFilesCreationRemovesTheWrittenFiles()
    {
        await this.test('a failed project files creation answers installation-process-failed and removes its files', async () => {
            let result = await this.runInstall((installer) => {
                this.stubDatabaseInstallation(installer, true);
                installer.projectFilesCreation.themeManager.reldensModulePathInstallTemplateEnvDist = FileHandler.joinPaths(
                    this.installProjectRoot,
                    'missing-env.dist'
                );
            }, {});
            FileHandler.remove(this.installProjectRoot);
            this.assert.deepStrictEqual(
                [result.redirect, result.status, result.projectFiles],
                ['/?error=installation-process-failed', 'Creating project files...', []]
            );
        });
    }

    seedSampleAssets(installer)
    {
        for(let assetsPath of [installer.themeManager.projectAssetsPath, installer.themeManager.assetsDistPath]){
            this.writeSampleAssetsFiles(assetsPath);
        }
    }

    writeSampleAssetsFiles(assetsPath)
    {
        for(let fileParts of this.sampleAssetsFiles){
            let filePath = FileHandler.joinPaths(assetsPath, ...fileParts);
            FileHandler.createFolder(FileHandler.getFolderName(filePath));
            FileHandler.writeFile(filePath, 'sample');
        }
    }

    readSampleAssetsFolders(installer)
    {
        return [installer.themeManager.projectAssetsPath, installer.themeManager.assetsDistPath].map(assetsPath => [
            FileHandler.readFolder(FileHandler.joinPaths(assetsPath, 'audio')),
            FileHandler.readFolder(FileHandler.joinPaths(assetsPath, 'maps')),
            FileHandler.readFolder(FileHandler.joinPaths(assetsPath, 'custom', 'items')),
            FileHandler.readFolder(FileHandler.joinPaths(assetsPath, 'custom', 'sprites'))
        ]);
    }

    async testAnInstallationWithoutSampleDataCleansTheSampleAssets()
    {
        await this.test('an installation without the sample data empties the sample assets and keeps them with it', async () => {
            let prepareInstaller = (installer) => {
                this.stubDatabaseInstallation(installer, true);
                this.seedSampleAssets(installer);
            };
            let withoutSampleData = await this.runInstall(prepareInstaller, {'db-sample-data': '0'});
            let cleanedAssets = this.readSampleAssetsFolders(withoutSampleData.installer);
            let withSampleData = await this.runInstall(prepareInstaller, {'db-sample-data': '1'});
            let keptAssets = this.readSampleAssetsFolders(withSampleData.installer);
            FileHandler.remove(this.installProjectRoot);
            let cleanedRoot = [[], [], [], [GameConst.IMAGE_PLAYER_BASE]];
            let keptRoot = [['sample.mp3'], ['sample.json'], ['sample.png'], [GameConst.IMAGE_PLAYER_BASE, 'sample-sprite.png']];
            this.assert.deepStrictEqual(
                [withoutSampleData.redirect, withoutSampleData.projectFiles, cleanedAssets],
                ['http://localhost:8080', this.projectFiles, [cleanedRoot, cleanedRoot]]
            );
            this.assert.deepStrictEqual([withSampleData.redirect, keptAssets], ['http://localhost:8080', [keptRoot, keptRoot]]);
        });
    }

}

module.exports.TestInstallationFailures = TestInstallationFailures;
