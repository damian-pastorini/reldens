/**
 *
 * Reldens - Test Admin Maps Wizard File Names
 *
 * Tests the maps wizard generation paths: a generated folder sent in the generator data never moves the generated
 * maps out of the generate-data/generated folder, and the map, tile sheet, composite, layer elements and maps names
 * with folders are rejected for every strategy before any file is read, copied or written.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { TimeConstants } = require('./helpers/time-constants');
const { ServerPathResolver } = require('../server-path-resolver');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminMapsWizardFileNames
{

    static MAP_NAME = 'e2e-generated-folder-map';
    static OUTSIDE_FOLDER = 'e2e-outside-folder';
    static PARENT_FOLDER = '..';
    static EXAMPLES_PATH = FileHandler.joinPaths(
        process.cwd(),
        'node_modules',
        '@reldens',
        'tile-map-generator',
        'examples'
    );

    static fetchExampleData(examplesFolder, fileName)
    {
        let exampleData = FileHandler.fetchFileJson(
            FileHandler.joinPaths(TestAdminMapsWizardFileNames.EXAMPLES_PATH, examplesFolder, fileName)
        );
        expect(exampleData, 'The generator example data must be loaded: '+fileName).toBeTruthy();
        return exampleData;
    }

    static async postGenerate(page, gameConfig, longRun, mapsWizardAction, generatorData)
    {
        return await page.request.post(AdminPanelSession.adminPath(gameConfig)+'/maps-wizard', {
            multipart: {
                _csrf: await AdminPanelSession.fetchCsrfToken(page),
                mainAction: 'generate',
                mapsWizardAction,
                generatorData: sc.toJsonString(generatorData)
            },
            maxRedirects: 0,
            timeout: TimeConstants.forLongRun(TimeConstants.MAPS_GENERATION, longRun)
        });
    }

    static removeGeneratedMapFiles(generatedPath)
    {
        for(let fileName of FileHandler.readFolder(generatedPath)){
            if(0 === fileName.indexOf(TestAdminMapsWizardFileNames.MAP_NAME)){
                FileHandler.remove(FileHandler.joinPaths(generatedPath, fileName));
            }
        }
    }

    static async runGeneratedFolderTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        let generateDataPath = FileHandler.joinPaths(ServerPathResolver.resolve(gameConfig.serverPath), 'generate-data');
        let outsideFolder = FileHandler.joinPaths(generateDataPath, TestAdminMapsWizardFileNames.OUTSIDE_FOLDER);
        let mapFile = '/'+TestAdminMapsWizardFileNames.MAP_NAME+'.json';
        FileHandler.remove(outsideFolder);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let generatorData = TestAdminMapsWizardFileNames.fetchExampleData(
            'layer-elements-composite',
            'map-composite-data.json'
        );
        generatorData.mapName = TestAdminMapsWizardFileNames.MAP_NAME;
        generatorData.generatedFolder = outsideFolder;
        let response = await TestAdminMapsWizardFileNames.postGenerate(
            page,
            gameConfig,
            longRun,
            'elements-composite-loader',
            generatorData
        );
        expect(response.status(), 'The maps must be generated: '+sc.get(response.headers(), 'location', '')).toBe(200);
        let generatedMapResponse = await page.request.get(adminPath+'/generated'+mapFile);
        expect(generatedMapResponse.status(), 'The map must be written in the generated folder').toBe(200);
        expect(sc.get(await generatedMapResponse.json(), 'tilesets', []).length, 'The map tileset').toBe(1);
        let outsideMapResponse = await page.request.get(
            adminPath+'/generate-data/'+TestAdminMapsWizardFileNames.OUTSIDE_FOLDER+mapFile
        );
        expect(outsideMapResponse.status(), 'Nothing must be written in the folder sent in the request').toBe(404);
        await page.setContent(await response.text());
        await screenshots.capture(page, 'maps-generated-in-generated-folder');
        TestAdminMapsWizardFileNames.removeGeneratedMapFiles(FileHandler.joinPaths(generateDataPath, 'generated'));
    }

    static buildFolderNamesCases()
    {
        let outsideName = FileHandler.joinPaths(TestAdminMapsWizardFileNames.PARENT_FOLDER, 'e2e-outside-name');
        let cases = [];
        for(let fileNameKey of ['mapName', 'mapFileName', 'tileSheetName', 'tileSheetPath']){
            let objectData = TestAdminMapsWizardFileNames.fetchExampleData('layer-elements-object', 'map-data.json');
            objectData[fileNameKey] = outsideName+'.json';
            cases.push({label: fileNameKey, action: 'elements-object-loader', data: objectData});
        }
        let elementsData = TestAdminMapsWizardFileNames.fetchExampleData('layer-elements-object', 'map-data.json');
        elementsData.layerElementsFiles.tree = outsideName+'.json';
        cases.push({label: 'layerElementsFiles', action: 'elements-object-loader', data: elementsData});
        let compositeData = TestAdminMapsWizardFileNames.fetchExampleData(
            'layer-elements-composite',
            'map-composite-data.json'
        );
        compositeData.compositeElementsFile = outsideName+'.json';
        cases.push({label: 'compositeElementsFile', action: 'elements-composite-loader', data: compositeData});
        let namesData = TestAdminMapsWizardFileNames.fetchExampleData(
            'layer-elements-composite',
            'map-composite-data-with-names.json'
        );
        namesData.mapNames.push(outsideName);
        cases.push({label: 'mapNames', action: 'multiple-by-loader', data: namesData});
        let associationsData = TestAdminMapsWizardFileNames.fetchExampleData(
            'layer-elements-composite',
            'map-composite-data-with-associations.json'
        );
        associationsData.mapsInformation.push({mapName: outsideName, mapTitle: 'Outside'});
        cases.push({label: 'mapsInformation', action: 'multiple-with-association-by-loader', data: associationsData});
        return cases;
    }

    static async runFolderNamesTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        let expectedLocation = adminPath+'/maps-wizard?result=mapsWizardInvalidFileNameError';
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        for(let folderNameCase of TestAdminMapsWizardFileNames.buildFolderNamesCases()){
            let response = await TestAdminMapsWizardFileNames.postGenerate(
                page,
                gameConfig,
                longRun,
                folderNameCase.action,
                folderNameCase.data
            );
            expect(response.status(), 'Rejected: '+folderNameCase.label).toBe(302);
            expect(sc.get(response.headers(), 'location', ''), 'Rejected: '+folderNameCase.label).toBe(expectedLocation);
        }
        let outsideFileResponse = await page.request.get(adminPath+'/generate-data/e2e-outside-name.json');
        expect(outsideFileResponse.status(), 'Nothing must be written outside the generated folder').toBe(404);
        await page.goto(expectedLocation);
        await screenshots.capture(page, 'maps-wizard-folder-names-rejected');
    }

    static run()
    {
        test.describe('Admin Maps Wizard File Names', () => {
            test(
                'maps wizard keeps the generated maps in the generated folder',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminMapsWizardFileNames.runGeneratedFolderTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'maps wizard rejects the names with folders for every strategy',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminMapsWizardFileNames.runFolderNamesTest(page, screenshots, gameConfig, longRun);
                }
            );
        });
    }

}

TestAdminMapsWizardFileNames.run();
