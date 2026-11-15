/**
 *
 * Reldens - MapsWizardBaseTest
 *
 * Base of the maps wizard tests: a test folder in test-results named by the test, with a generate-data folder used as
 * the theme manager generate data path (and its generated folder as the generated data path) and the theme and dist
 * runtime maps folders, the reset of that folder, an admin manager for the maps wizard subscriber that records every rendered page data in the given list, and
 * the maps wizard generate action run with a strategy and a tile-map-generator sample data file.
 *
 */

const { BaseTest } = require('../base-test');
const { SampleFileCopier } = require('../../lib/admin/server/sample-file-copier');
const { MapsWizardSubscriber } = require('../../lib/admin/server/subscribers/maps-wizard-subscriber');
const { FileHandler } = require('@reldens/server-utils');

class MapsWizardBaseTest extends BaseTest
{

    constructor(config, testFolderName)
    {
        super(config);
        this.testFolder = FileHandler.joinPaths(process.cwd(), 'test-results', testFolderName);
        this.rootFolder = FileHandler.joinPaths(this.testFolder, 'generate-data');
        this.themeManager = {
            projectRoot: process.cwd(),
            projectGenerateDataPath: this.rootFolder,
            projectGeneratedDataPath: FileHandler.joinPaths(this.rootFolder, 'generated'),
            projectAssetsPath: FileHandler.joinPaths(this.testFolder, 'theme-assets'),
            assetsDistPath: FileHandler.joinPaths(this.testFolder, 'dist-assets')
        };
        this.runtimeMapsFolders = [
            FileHandler.joinPaths(this.themeManager.projectAssetsPath, 'maps'),
            FileHandler.joinPaths(this.themeManager.assetsDistPath, 'maps')
        ];
        this.compositeExamplesPath = FileHandler.joinPaths(
            new SampleFileCopier(this.themeManager).examplesPath,
            'layer-elements-composite'
        );
    }

    async generateSampleMaps(strategy, generatorDataFileName)
    {
        this.resetTestFolder();
        let generation = {redirects: [], rendered: [], sent: 0};
        let adminManager = this.createAdminManager(generation.rendered);
        await new MapsWizardSubscriber(adminManager, {}, this.themeManager).generateMaps(
            {body: {
                mainAction: 'generate',
                mapsWizardAction: strategy,
                generatorData: FileHandler.readFile(FileHandler.joinPaths(this.compositeExamplesPath, generatorDataFileName)),
                tilesetSessionId: ''
            }},
            {redirect: (path) => generation.redirects.push(path), send: () => generation.sent++},
            adminManager
        );
        return generation;
    }

    resetTestFolder()
    {
        FileHandler.remove(this.testFolder);
        FileHandler.createFolder(this.rootFolder);
        for(let mapsFolder of this.runtimeMapsFolders){
            FileHandler.createFolder(mapsFolder);
        }
    }

    createAdminManager(renderedData)
    {
        return {
            events: {on: () => true},
            dataServer: {getEntity: () => ({})},
            uploaderFactory: {createUploader: () => () => true},
            contentsBuilder: {
                render: async (template, data) => renderedData.push(data),
                renderRoute: async () => '',
                adminContents: {}
            },
            adminFilesContents: {mapsWizardMapsSelection: 'maps selection'},
            router: {isAuthenticated: () => true}
        };
    }

}

module.exports.MapsWizardBaseTest = MapsWizardBaseTest;
