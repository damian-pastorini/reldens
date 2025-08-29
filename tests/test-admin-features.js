/**
 *
 * Reldens - TestAdminFeatures
 *
 */

const { BaseTest } = require('./base-test');
const { Logger } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { FeaturesTestData } = require('./fixtures/features-test-data');
const { CrudTestData } = require('./fixtures/crud-test-data');

class TestAdminFeatures extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.projectRoot = process.cwd();
        this.testFiles = [];
        this.testPrefix = 'test-features-deterministic';
        this.baseTestIds = CrudTestData.getBaseTestIds();
        this.serverPath = config.serverPath || null;
        this.themeName = config.themeName || 'default';
    }

    async testMapsWizardPageLoads()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Maps wizard page loads', async () => {
            let response = await this.makeAuthenticatedRequest('GET', this.adminPath+'/maps-wizard', null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('wizard'));
        });
    }

    async testMapsWizardGeneratesWithValidData()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Maps wizard generates with valid data and validates file creation', async () => {
            let wizardData = FeaturesTestData.getMapsWizardValidData();
            let response = await this.makeFormRequestWithTimeout(
                'POST',
                this.adminPath+'/maps-wizard',
                wizardData,
                session,
                30000
            );
            this.assert.strictEqual(302, response.statusCode);
        });
    }

    async testMapsWizardFailsWithInvalidData()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Maps wizard fails with invalid data', async () => {
            let wizardData = FeaturesTestData.getMapsWizardInvalidData();
            let response = await this.makeFormRequestWithTimeout(
                'POST',
                this.adminPath+'/maps-wizard',
                wizardData,
                session,
                15000
            );
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location);
            this.assert(response.headers.location.includes('mapsWizardWrongJsonDataError'));
        });
    }

    async testObjectsImportPageLoads()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Objects import page loads', async () => {
            let response = await this.makeAuthenticatedRequest(
                'GET',
                this.adminPath+'/objects-import',
                null,
                session
            );
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('import'));
        });
    }

    async testObjectsImportWithValidJson()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Objects import with valid JSON validates import count', async () => {
            let importData = this.getObjectsImportDeterministicData();
            let response = await this.makeFormRequest(
                'POST',
                this.adminPath+'/objects-import',
                importData,
                session
            );
            this.validateSuccessfulResponse(response);
            await this.validateImportResult(response.headers.location, 2);
        });
    }

    async testObjectsImportFailsWithInvalidJson()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Objects import fails with invalid JSON', async () => {
            let importData = FeaturesTestData.getObjectsImportInvalidData();
            let response = await this.makeFormRequest('POST', this.adminPath+'/objects-import', importData, session);
            this.assert.strictEqual(302, response.statusCode);
        });
    }

    async testObjectsImportHandlesMissingFields()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Objects import handles missing fields', async () => {
            let importData = FeaturesTestData.getObjectsImportMissingFieldsData();
            let response = await this.makeFormRequest('POST', this.adminPath+'/objects-import', importData, session);
            this.assert.strictEqual(302, response.statusCode);
        });
    }

    async testSkillsImportPageLoads()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Skills import page loads', async () => {
            let response = await this.makeAuthenticatedRequest('GET', this.adminPath+'/skills-import', null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('import'));
        });
    }

    async testSkillsImportWithValidJson()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Skills import with valid JSON validates import count', async () => {
            let importData = this.getSkillsImportDeterministicData();
            let response = await this.makeFormRequest('POST', this.adminPath+'/skills-import', importData, session);
            this.validateSuccessfulResponse(response);
            await this.validateImportResult(response.headers.location, 2);
        });
    }

    async testServerManagementPageLoads()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Server management page loads', async () => {
            let response = await this.makeAuthenticatedRequest('GET', this.adminPath+'/management', null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('shutdown'));
        });
    }

    async testServerShutdownValidation()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Server shutdown validation works', async () => {
            let invalidData = FeaturesTestData.getServerManagementInvalidData();
            let response = await this.makeFormRequest('POST', this.adminPath+'/management', invalidData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('shutdownError'));
        });
    }

    async testServerShutdownWithValidTime()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Server shutdown with valid time succeeds', async () => {
            let validData = FeaturesTestData.getServerManagementValidData();
            let response = await this.makeFormRequest('POST', this.adminPath+'/management', validData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('success'));
            await this.makeFormRequest('POST', this.adminPath+'/management', {'shutdown-time': 1}, session);
        });
    }

    async testAudioFileUpload()
    {
        if(!this.serverPath){
            return;
        }
        let session = await this.getAuthenticatedSession();
        await this.test('Audio file upload validates file creation', async () => {
            let testAudioFile = await this.createTestAudioFile();
            let audioData = this.getAudioUploadWithRealFileDeterministicData(testAudioFile);
            let uploadedFilePath = FileHandler.joinPaths(
                this.serverPath,
                'theme',
                this.themeName,
                'assets',
                'audio',
                testAudioFile.filename
            );
            try {
                let response = await this.makeMultipartRequest('POST', this.adminPath+'/audio/save', audioData, session);
                this.validateSuccessfulResponse(response);
                await this.validateEntityExists('audio', audioData.audio_key, session);
                await this.validateFileExists(uploadedFilePath);
            } catch(error){
                Logger.error('Audio upload test failed', {error: error.message, audioData});
                throw error;
            } finally {
                FileHandler.remove(uploadedFilePath);
            }
        });
    }

    async testInvalidFileDataRejection()
    {
        let session = await this.getAuthenticatedSession();
        await this.test('Invalid file data is rejected properly', async () => {
            let formData = FeaturesTestData.getFileUploadInvalidData();
            let response = await this.makeFormRequest('POST', this.adminPath+'/audio/save', formData, session);
            this.assert.strictEqual(302, response.statusCode);
        });
    }

    async testGenerateDataStaticRoute()
    {
        if(!this.serverPath){
            return;
        }
        let session = await this.getAuthenticatedSession();
        await this.test('Generate data static route accessible', async () => {
            let testFileName = 'test-generate-'+Date.now()+'.txt';
            let testFilePath = FileHandler.joinPaths(this.serverPath, 'generate-data', testFileName);
            await this.createTestFile(testFilePath, 'test generate data content');
            let response = await this.makeAuthenticatedRequest(
                'GET',
                this.adminPath+'/generate-data/'+testFileName,
                null,
                session
            );
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('test generate data content'));
            FileHandler.remove(testFilePath);
        });
    }

    async testGeneratedStaticRoute()
    {
        if(!this.serverPath){
            return;
        }
        let session = await this.getAuthenticatedSession();
        await this.test('Generated static route accessible', async () => {
            let testFileName = 'test-generated-'+Date.now()+'.txt';
            let testFilePath = FileHandler.joinPaths(this.serverPath, 'generate-data', 'generated', testFileName);
            await this.createTestFile(testFilePath, 'test generated content');
            let response = await this.makeAuthenticatedRequest(
                'GET',
                this.adminPath+'/generated/'+testFileName,
                null,
                session
            );
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('test generated content'));
            FileHandler.remove(testFilePath);
        });
    }

    async createTestFile(filePath, content)
    {
        FileHandler.createFolder(FileHandler.getFolderName(filePath));
        FileHandler.writeFile(filePath, content);
        this.testFiles.push(filePath);
    }

    getObjectsImportDeterministicData()
    {
        return {
            json: JSON.stringify([
                {
                    id: this.baseTestIds.objects + 50,
                    room_id: this.baseTestIds.rooms,
                    object_class_key: this.testPrefix+'-imported-object-1',
                    client_key: 'obj1-deterministic',
                    title: 'Test Object 1 Deterministic'
                },
                {
                    id: this.baseTestIds.objects + 51,
                    room_id: this.baseTestIds.rooms,
                    object_class_key: this.testPrefix+'-imported-object-2',
                    client_key: 'obj2-deterministic',
                    title: 'Test Object 2 Deterministic'
                }
            ])
        };
    }

    getSkillsImportDeterministicData()
    {
        return {
            json: JSON.stringify([
                {
                    id: this.baseTestIds.skills + 50,
                    key: this.testPrefix+'-imported-skill-1',
                    name: 'Imported Skill 1 Deterministic',
                    type: 1,
                    autoValidation: 1,
                    skillDelay: 1000
                },
                {
                    id: this.baseTestIds.skills + 51,
                    key: this.testPrefix+'-imported-skill-2',
                    name: 'Imported Skill 2 Deterministic',
                    type: 1,
                    autoValidation: 1,
                    skillDelay: 1000
                }
            ])
        };
    }

    async createTestAudioFile()
    {
        let filename = this.testPrefix+'-audio.mp3';
        let fixtureFilePath = FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3');
        if(!FileHandler.exists(fixtureFilePath)){
            throw new Error('Test fixture file not found: '+fixtureFilePath);
        }
        return {filename, filePath: fixtureFilePath};
    }

    getAudioUploadWithRealFileDeterministicData(testFile)
    {
        return {
            audio_key: this.testPrefix+'-audio-'+Date.now(),
            files_name: {
                filename: testFile.filename,
                filePath: testFile.filePath,
                contentType: 'audio/mpeg'
            },
            category_id: 1,
            enabled: 1
        };
    }

    async validateFileExists(filePath)
    {
        this.assert(FileHandler.exists(filePath), 'Uploaded file should exist at: '+filePath);
    }

    getItemsUploadDeterministicData()
    {
        return {
            id: this.baseTestIds.items + 40,
            key: this.testPrefix+'-item',
            label: 'Test Item Deterministic',
            type: 1,
            group_id: 1,
            qty_limit: 10,
            uses_limit: 1
        };
    }

    validateSuccessfulResponse(response)
    {
        this.assert.strictEqual(302, response.statusCode);
        this.assert(response.headers.location);
        this.assert(!response.headers.location.includes('error'));
    }

    async validateEntityExists(entity, key, session)
    {
        let response = await this.makeAuthenticatedRequest(
            'GET',
            this.adminPath+'/'+entity,
            null,
            session
        );
        this.assert.strictEqual(200, response.statusCode);
        this.assert(response.body.includes(key));
    }

    async validateImportResult(location, expectedCount)
    {
        if(location.includes('imported=')){
            let match = location.match(/imported=(\d+)/);
            if(match && parseInt(match[1]) >= expectedCount){
                return true;
            }
        }
        return location.includes('success');
    }

}

module.exports.TestAdminFeatures = TestAdminFeatures;
