/**
 *
 * Reldens - Test Admin Generator Data Imports
 *
 * Tests the admin objects and skills imports from the generator data: the posted generator JSON or the uploaded
 * generator file is imported and redirects with success, no data and no file redirects with the missing data error, an
 * uploaded file that is not JSON with the data error, and an importer that rejects the data with its error code or the
 * default import error.
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectsImporterSubscriber } = require('../lib/admin/server/subscribers/objects-importer-subscriber');
const { SkillsImporterSubscriber } = require('../lib/admin/server/subscribers/skills-importer-subscriber');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestAdminGeneratorDataImports extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.fixturesPath = FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures');
        this.rootPath = '/reldens-admin';
        this.generatorDataRequest = {body: {generatorData: '{"key":"generated"}'}};
        this.importers = [
            {key: 'objects', subscriberClass: ObjectsImporterSubscriber, pathKey: 'objectsImportPath', importerKey: 'objectsImporter', methodName: 'importObjects'},
            {key: 'skills', subscriberClass: SkillsImporterSubscriber, pathKey: 'skillsImportPath', importerKey: 'skillsImporter', methodName: 'importSkills'}
        ];
    }

    async runImport(importer, importResult, errorCode, req)
    {
        let importRun = {importedData: []};
        let subscriber = Object.assign(Object.create(importer.subscriberClass.prototype), {
            rootPath: this.rootPath,
            [importer.pathKey]: '/'+importer.key+'-import',
            themeManager: {projectGeneratedDataPath: this.fixturesPath},
            [importer.importerKey]: {errorCode, import: async (data) => importRun.importedData.push(data) && importResult}
        });
        importRun.result = (await subscriber[importer.methodName](req)).split('?result=').pop();
        return importRun;
    }

    async testTheGeneratorDataIsImported()
    {
        await this.test('the posted generator JSON or the uploaded generator file is imported and redirects with success', async () => {
            let fileData = sc.toJson(await FileHandler.fetchFileContents(FileHandler.joinPaths(this.fixturesPath, 'test-file.json')));
            for(let importer of this.importers){
                this.assert.deepStrictEqual(
                    [
                        await this.runImport(importer, true, false, this.generatorDataRequest),
                        await this.runImport(importer, true, false, {body: {}, files: {generatorJsonFiles: [{originalname: 'test-file.json'}]}})
                    ],
                    [{result: 'success', importedData: [{key: 'generated'}]}, {result: 'success', importedData: [fileData]}]
                );
            }
        });
    }

    async testTheMissingOrInvalidDataIsNotImported()
    {
        await this.test('no data and no file or an uploaded file that is not JSON redirect with their error and import nothing', async () => {
            for(let importer of this.importers){
                this.assert.deepStrictEqual(
                    [
                        await this.runImport(importer, true, false, {body: {}}),
                        await this.runImport(importer, true, false, {body: {}, files: {generatorJsonFiles: [{originalname: 'test-audio.mp3'}]}})
                    ],
                    [
                        {result: importer.key+'ImportMissingDataError', importedData: []},
                        {result: importer.key+'ImportDataError', importedData: []}
                    ]
                );
            }
        });
    }

    async testTheRejectedImportRedirectsWithItsError()
    {
        await this.test('an importer that rejects the data redirects with its error code or the default import error', async () => {
            for(let importer of this.importers){
                this.assert.deepStrictEqual(
                    [
                        (await this.runImport(importer, false, 'invalidGeneratorData', this.generatorDataRequest)).result,
                        (await this.runImport(importer, false, false, this.generatorDataRequest)).result
                    ],
                    ['invalidGeneratorData', importer.key+'ImportError']
                );
            }
        });
    }

}

module.exports.TestAdminGeneratorDataImports = TestAdminGeneratorDataImports;
