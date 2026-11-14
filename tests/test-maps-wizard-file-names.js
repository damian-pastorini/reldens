/**
 *
 * Reldens - Test Maps Wizard File Names
 *
 */

const { BaseTest } = require('./base-test');
const { FeaturesTestData } = require('./fixtures/features-test-data');
const { MapsWizardFileNamesValidator } = require('../lib/admin/server/maps-wizard-file-names-validator');
const { SampleFileCopier } = require('../lib/admin/server/sample-file-copier');
const { CompositeSampleFilesProvider } = require('../lib/admin/server/composite-sample-files-provider');
const { MapsWizardSubscriber } = require('../lib/admin/server/subscribers/maps-wizard-subscriber');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestMapsWizardFileNames extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.validator = new MapsWizardFileNamesValidator();
        this.parentFolder = '..';
        this.testFolder = FileHandler.joinPaths(process.cwd(), 'test-results', 'maps-wizard-file-names');
        this.rootFolder = FileHandler.joinPaths(this.testFolder, 'root');
        this.themeManager = {
            projectRoot: process.cwd(),
            projectGenerateDataPath: this.rootFolder,
            projectGeneratedDataPath: FileHandler.joinPaths(this.rootFolder, 'generated')
        };
        let examplesPath = new SampleFileCopier(this.themeManager).examplesPath;
        this.objectMapDataPath = FileHandler.joinPaths(examplesPath, 'layer-elements-object', 'map-data.json');
        this.compositeExamplesPath = FileHandler.joinPaths(examplesPath, 'layer-elements-composite');
        this.namesMapDataPath = FileHandler.joinPaths(this.compositeExamplesPath, 'map-composite-data-with-names.json');
        this.associationsMapDataPath = FileHandler.joinPaths(
            this.compositeExamplesPath,
            'map-composite-data-with-associations.json'
        );
        this.townCompositePath = FileHandler.joinPaths(this.compositeExamplesPath, 'reldens-town-composite.json');
    }

    resetTestFolder()
    {
        FileHandler.remove(this.testFolder);
        FileHandler.createFolder(this.rootFolder);
    }

    async testIsFileNameAcceptsFileNames()
    {
        await this.test('isFileName accepts the names without folders', async () => {
            for(let fileName of ['town-001', 'town-001.json', 'tilesheet.png', 'reldens-town-composite.json']){
                this.assert.strictEqual(this.validator.isFileName(fileName), true, fileName);
            }
        });
    }

    async testIsFileNameRejectsFolders()
    {
        await this.test('isFileName rejects the names pointing to another folder', async () => {
            let fileNames = [
                FileHandler.joinPaths(this.parentFolder, 'outside.json'),
                this.parentFolder,
                'folder/map.json',
                '/tmp/map.json'
            ];
            for(let fileName of fileNames){
                this.assert.strictEqual(this.validator.isFileName(fileName), false, fileName);
            }
        });
    }

    async testIsFileNameRejectsEmptyAndNonStrings()
    {
        await this.test('isFileName rejects the empty and the non string names', async () => {
            for(let fileName of ['', null, false, 12, {}]){
                this.assert.strictEqual(this.validator.isFileName(fileName), false, String(fileName));
            }
        });
    }

    async testFetchFileNamesCollectsEveryName()
    {
        await this.test('fetchFileNames collects the names, the elements files and the maps names', async () => {
            let mapData = {
                mapName: 'town',
                mapFileName: 'town.json',
                tileSheetName: 'town.png',
                tileSheetPath: 'tilesheet.png',
                compositeElementsFile: 'composite.json',
                layerElementsFiles: {house1: 'house-001.json', tree: 'tree.json'},
                mapNames: ['map-001', 'map-002'],
                mapsInformation: [{mapName: 'town-001', mapTitle: 'Town 1'}, {mapTitle: 'No name'}],
                factor: 2
            };
            this.assert.deepStrictEqual(this.validator.fetchFileNames(mapData), [
                'town',
                'town.json',
                'town.png',
                'tilesheet.png',
                'composite.json',
                'house-001.json',
                'tree.json',
                'map-001',
                'map-002',
                'town-001',
                ''
            ]);
        });
    }

    async testFetchFileNamesSkipsOtherShapes()
    {
        await this.test('fetchFileNames skips the lists sent with another shape and keeps the null names', async () => {
            let mapData = {layerElementsFiles: 'tree.json', mapNames: 'map-001,map-002', mapsInformation: 'town-001'};
            this.assert.deepStrictEqual(this.validator.fetchFileNames(mapData), []);
            this.assert.deepStrictEqual(this.validator.fetchFileNames({}), []);
            this.assert.deepStrictEqual(this.validator.fetchFileNames({mapName: null}), [null]);
        });
    }

    async testHasOnlyFileNamesAcceptsWizardData()
    {
        await this.test('hasOnlyFileNames accepts the wizard sample data of every strategy', async () => {
            let wizardData = [
                sc.toJson(FeaturesTestData.getMapsWizardValidData().generatorData),
                FileHandler.fetchFileJson(this.objectMapDataPath),
                FileHandler.fetchFileJson(this.namesMapDataPath),
                FileHandler.fetchFileJson(this.associationsMapDataPath)
            ];
            for(let mapData of wizardData){
                this.assert.strictEqual(this.validator.hasOnlyFileNames(mapData), true);
            }
        });
    }

    async testHasOnlyFileNamesRejectsEachNameWithFolders()
    {
        await this.test('hasOnlyFileNames rejects every name pointing to another folder', async () => {
            let outsideName = FileHandler.joinPaths(this.parentFolder, 'outside');
            for(let fileNameKey of this.validator.fileNameKeys){
                let mapData = FileHandler.fetchFileJson(this.objectMapDataPath);
                mapData[fileNameKey] = outsideName;
                this.assert.strictEqual(this.validator.hasOnlyFileNames(mapData), false, fileNameKey);
            }
            let objectData = FileHandler.fetchFileJson(this.objectMapDataPath);
            objectData.layerElementsFiles.tree = outsideName+'.json';
            this.assert.strictEqual(this.validator.hasOnlyFileNames(objectData), false, 'layer elements file');
            let namesData = FileHandler.fetchFileJson(this.namesMapDataPath);
            namesData.mapNames.push(outsideName);
            this.assert.strictEqual(this.validator.hasOnlyFileNames(namesData), false, 'maps names item');
            let infoData = FileHandler.fetchFileJson(this.associationsMapDataPath);
            infoData.mapsInformation.push({mapName: outsideName, mapTitle: 'Outside'});
            this.assert.strictEqual(this.validator.hasOnlyFileNames(infoData), false, 'maps information name');
            infoData.mapsInformation.pop();
            infoData.mapsInformation.push({mapTitle: 'No name'});
            this.assert.strictEqual(this.validator.hasOnlyFileNames(infoData), false, 'maps information without name');
        });
    }

    async testSampleFileCopierCopiesFileNames()
    {
        await this.test('the sample file copier copies a file name into the root folder', async () => {
            this.resetTestFolder();
            let copier = new SampleFileCopier(this.themeManager);
            let sourceFolder = FileHandler.joinPaths(copier.examplesPath, 'layer-elements-object');
            this.assert.strictEqual(copier.copy(sourceFolder, this.rootFolder, 'tree.json'), true);
            this.assert.deepStrictEqual(
                FileHandler.fetchFileJson(FileHandler.joinPaths(this.rootFolder, 'tree.json')),
                FileHandler.fetchFileJson(FileHandler.joinPaths(sourceFolder, 'tree.json'))
            );
            FileHandler.remove(this.testFolder);
        });
    }

    async testSampleFileCopierRejectsNamesWithFolders()
    {
        await this.test('the sample file copier never copies a name pointing to another folder', async () => {
            this.resetTestFolder();
            let copier = new SampleFileCopier(this.themeManager);
            let sourceFolder = FileHandler.joinPaths(copier.examplesPath, 'layer-elements-object');
            let outsideName = FileHandler.joinPaths(this.parentFolder, 'tree.json');
            this.assert.strictEqual(copier.copy(sourceFolder, this.rootFolder, outsideName), false);
            this.assert.strictEqual(FileHandler.exists(FileHandler.joinPaths(this.testFolder, 'tree.json')), false);
            this.assert.deepStrictEqual(FileHandler.readFolder(this.rootFolder), []);
            FileHandler.remove(this.testFolder);
        });
    }

    async testCompositeProviderCopiesSampleComposite()
    {
        await this.test('the composite provider copies a sample composite and its tilesets images', async () => {
            this.resetTestFolder();
            let provider = new CompositeSampleFilesProvider(this.themeManager);
            let compositeJson = FileHandler.fetchFileJson(this.townCompositePath);
            this.assert.strictEqual(provider.ensureCompositeFile(this.rootFolder, 'reldens-town-composite.json'), true);
            this.assert.deepStrictEqual(
                FileHandler.fetchFileJson(FileHandler.joinPaths(this.rootFolder, 'reldens-town-composite.json')),
                compositeJson
            );
            for(let tileset of compositeJson.tilesets){
                this.assert(FileHandler.exists(FileHandler.joinPaths(this.rootFolder, tileset.image)), tileset.image);
            }
            FileHandler.remove(this.testFolder);
        });
    }

    async testCompositeProviderRejectsNamesWithFolders()
    {
        await this.test('the composite provider rejects the main and the associated names with folders', async () => {
            this.resetTestFolder();
            let provider = new CompositeSampleFilesProvider(this.themeManager);
            let outsideComposite = FileHandler.joinPaths(this.parentFolder, 'reldens-town-composite.json');
            this.assert.strictEqual(provider.ensureCompositeFile(this.rootFolder, outsideComposite), false);
            this.assert.strictEqual(
                FileHandler.exists(FileHandler.joinPaths(this.testFolder, 'reldens-town-composite.json')),
                false
            );
            let associatedProperty = {
                name: 'compositeFileNames',
                value: FileHandler.joinPaths(this.parentFolder, 'house-composite')
            };
            FileHandler.writeFile(
                FileHandler.joinPaths(this.rootFolder, 'crafted-composite.json'),
                sc.toJsonString({tilesets: [], layers: [{name: 'house-01-doors', properties: [associatedProperty]}]})
            );
            this.assert.strictEqual(provider.ensureCompositeFile(this.rootFolder, 'crafted-composite.json'), false);
            this.assert.strictEqual(
                FileHandler.exists(FileHandler.joinPaths(this.testFolder, 'house-composite.json')),
                false
            );
            FileHandler.remove(this.testFolder);
        });
    }

    async testSubscriberRejectsRequestNamesWithFolders()
    {
        await this.test('the maps wizard rejects the request names with folders before any file', async () => {
            this.resetTestFolder();
            let adminManager = {
                events: {on: () => true},
                dataServer: {getEntity: () => ({})},
                uploaderFactory: {createUploader: () => () => true},
                contentsBuilder: {render: async () => '', renderRoute: async () => ''},
                router: {isAuthenticated: () => true}
            };
            let subscriber = new MapsWizardSubscriber(adminManager, {}, this.themeManager);
            let mapData = FileHandler.fetchFileJson(this.objectMapDataPath);
            mapData.mapFileName = FileHandler.joinPaths(this.parentFolder, 'outside.json');
            let requestBody = {
                mainAction: 'generate',
                mapsWizardAction: 'elements-object-loader',
                generatorData: sc.toJsonString(mapData)
            };
            let redirects = [];
            let response = {redirect: (path) => redirects.push(path)};
            for(let tilesetSessionId of ['', 'session-01']){
                await subscriber.generateMaps({body: {...requestBody, tilesetSessionId}}, response, adminManager);
            }
            this.assert.deepStrictEqual(redirects, [
                '/maps-wizard?result=mapsWizardInvalidFileNameError',
                '/maps-wizard?result=mapsWizardInvalidFileNameError&tilesetSessionId=session-01'
            ]);
            this.assert.deepStrictEqual(FileHandler.readFolder(this.rootFolder), []);
            FileHandler.remove(this.testFolder);
        });
    }

}

module.exports.TestMapsWizardFileNames = TestMapsWizardFileNames;
