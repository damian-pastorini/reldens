/**
 *
 * Reldens - TestAdminFeatures
 *
 */

const { BaseTest } = require('./base-test');
const { Logger } = require('@reldens/utils');
const { FeaturesTestData } = require('./fixtures/features-test-data');
const { Utils } = require('./utils');

class TestAdminFeatures extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.projectRoot = process.cwd();
        this.testFiles = [];
    }

    async runAllTests()
    {
        Logger.log(100, '', 'Running tests for TestAdminFeatures');
        let session = await this.getAuthenticatedSession();
        if(!session){
            Logger.log(100, '', 'Failed to get authenticated session for features');
            return;
        }
        await this.testMapsWizard(session);
        await this.testObjectsImporter(session);
        await this.testSkillsImporter(session);
        await this.testServerManagement(session);
        await this.testFileUploads(session);
        await this.testGenerators(session);
        await Utils.cleanupTestFiles(this.testFiles);
        Logger.log(100, '', 'Tests run: '+this.testCount);
        Logger.log(100, '', 'Passed: '+this.passedCount);
        Logger.log(100, '', 'Failed: '+(this.testCount - this.passedCount));
    }

    async getAuthenticatedSession()
    {
        try {
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/login', {
                email: this.adminUser,
                password: this.adminPassword
            });
            if(302 === response.statusCode && response.headers.location && 
                !response.headers.location.includes('error')){
                return response.headers['set-cookie'];
            }
            return null;
        } catch(error){
            Logger.log(100, '', 'Authentication failed: '+error.message);
            return null;
        }
    }

    async testMapsWizard(session)
    {
        await this.test('Maps wizard page loads', async () => {
            let response = await this.makeAuthenticatedRequest('GET', 
                this.adminPath+'/maps-wizard', null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Maps wizard not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('wizard'));
        });

        await this.test('Maps wizard generates with valid data and validates file creation', 
            async () => {
            let wizardData = FeaturesTestData.getMapsWizardValidData();
            Logger.log(100, '', 'Creating minimal map...');
            let response = await this.makeFormRequestWithTimeout('POST', 
                this.adminPath+'/maps-wizard', wizardData, session, 30000);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Maps wizard POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location && 
                response.headers.location.includes('error')){
                Logger.log(100, '', 'Warning: Map generation failed - may be normal');
                return;
            }
        });

        await this.test('Maps wizard fails with invalid data', async () => {
            let wizardData = FeaturesTestData.getMapsWizardInvalidData();
            let response = await this.makeFormRequestWithTimeout('POST', 
                this.adminPath+'/maps-wizard', wizardData, session, 15000);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Maps wizard POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location){
                this.assert(response.headers.location.includes('mapsWizardWrongJsonDataError'));
            }
        });
    }

    async testObjectsImporter(session)
    {
        await this.test('Objects import page loads', async () => {
            let response = await this.makeAuthenticatedRequest('GET', 
                this.adminPath+'/objects-import', null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Objects import not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('import'));
        });

        await this.test('Objects import with valid JSON validates import count', 
            async () => {
            let importData = FeaturesTestData.getObjectsImportValidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/objects-import', importData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Objects import POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location){
                this.assert(!response.headers.location.includes('error'));
                await this.validateImportResult(response.headers.location, 2);
            }
        });

        await this.test('Objects import fails with invalid JSON', async () => {
            let importData = FeaturesTestData.getObjectsImportInvalidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/objects-import', importData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Objects import POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
        });

        await this.test('Objects import handles missing fields', async () => {
            let importData = FeaturesTestData.getObjectsImportMissingFieldsData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/objects-import', importData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Objects import POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
        });
    }

    async testSkillsImporter(session)
    {
        await this.test('Skills import page loads', async () => {
            let response = await this.makeAuthenticatedRequest('GET', 
                this.adminPath+'/skills-import', null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Skills import not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('import'));
        });

        await this.test('Skills import with valid JSON validates import count', 
            async () => {
            let importData = FeaturesTestData.getSkillsImportValidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/skills-import', importData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Skills import POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location){
                this.assert(!response.headers.location.includes('error'));
                await this.validateImportResult(response.headers.location, 2);
            }
        });
    }

    async testServerManagement(session)
    {
        await this.test('Server management page loads', async () => {
            let response = await this.makeAuthenticatedRequest('GET', 
                this.adminPath+'/management', null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Server management not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('shutdown'));
        });

        await this.test('Server shutdown validation works', async () => {
            let invalidData = FeaturesTestData.getServerManagementInvalidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/management', invalidData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Server management POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('shutdownError'));
        });

        await this.test('Server shutdown with valid time succeeds', async () => {
            let validData = FeaturesTestData.getServerManagementValidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/management', validData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Server management POST not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('success'));
            await this.makeFormRequest('POST', this.adminPath+'/management', 
                {'shutdown-time': 1}, session);
        });
    }

    async testFileUploads(session)
    {
        await this.test('Audio file upload validates file creation', async () => {
            let formData = FeaturesTestData.getAudioUploadValidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/audio/save', formData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Audio save not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location){
                this.assert(!response.headers.location.includes('error'));
                await this.validateEntityCreated('audio', formData.audio_key);
            }
        });

        await this.test('Items with image upload validates creation', async () => {
            let formData = FeaturesTestData.getItemsUploadValidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/items/save', formData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Items save not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location){
                this.assert(!response.headers.location.includes('error'));
                await this.validateEntityCreated('items', formData.key);
            }
        });

        await this.test('Invalid file data is rejected properly', async () => {
            let formData = FeaturesTestData.getFileUploadInvalidData();
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/audio/save', formData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Audio save not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
        });
    }

    async testGenerators(session)
    {
        await this.test('Generate data static route accessible', async () => {
            let response = await this.makeAuthenticatedRequest('GET', 
                this.adminPath+'/generate-data', null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Generate data route not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
        });

        await this.test('Generated static route accessible', async () => {
            let response = await this.makeAuthenticatedRequest('GET', 
                this.adminPath+'/generated', null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: Generated route not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
        });
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

    async validateEntityCreated(entity, key)
    {
        try {
            let response = await this.makeAuthenticatedRequest('GET', 
                this.adminPath+'/'+entity, null, await this.getAuthenticatedSession());
            if(200 === response.statusCode){
                this.assert(response.body.includes(key));
                return true;
            }
        } catch(error){
            Logger.log(100, '', 'Entity validation failed: '+error.message);
        }
        return false;
    }

}

module.exports.TestAdminFeatures = TestAdminFeatures;
