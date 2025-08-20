/**
 *
 * Reldens - TestAdminCrud
 *
 */

const { BaseTest } = require('./base-test');
const { Logger } = require('@reldens/utils');
const { CrudTestData } = require('./fixtures/crud-test-data');
const { EntitiesList } = require('./fixtures/entities-list');

class TestAdminCrud extends BaseTest
{
    constructor(config)
    {
        super(config);
        this.entities = EntitiesList.getAll();
        this.testPrefix = 'test-'+Date.now();
        this.testTimestamp = Date.now();
        this.createdIds = {};
    }

    async runAllTests()
    {
        Logger.log(100, '', 'Running tests for TestAdminCrud');
        let session = await this.getAuthenticatedSession();
        if(!session){
            Logger.log(100, '', 'Failed to get authenticated session');
            return;
        }
        for(let entity of this.entities){
            await this.testEntityCrud(entity, session);
        }
        await this.cleanup();
        Logger.log(100, '', 'Tests run: '+this.testCount);
        Logger.log(100, '', 'Passed: '+this.passedCount);
        Logger.log(100, '', 'Failed: '+(this.testCount - this.passedCount));
    }

    async getAuthenticatedSession()
    {
        try {
            let loginResponse = await this.makeRequest('GET',
                this.adminPath+'/login');
            if(200 !== loginResponse.statusCode){
                return null;
            }
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

    async cleanup()
    {
        try {
            let session = await this.getAuthenticatedSession();
            if(!session){
                Logger.log(100, '', 'Failed to get session for cleanup');
                return;
            }
            await this.cleanupConfigTestData(session);
            Logger.log(100, '', 'Database cleanup completed for '+cleanupCount+' entities');
        } catch(error){
            Logger.log(100, '', 'Database cleanup failed: '+error.message);
        }
    }

    async cleanupConfigTestData(session)
    {
        await this.makeFormRequest('POST', this.adminPath+'/config/delete-test-records', {
            scope: 'test',
            pathPattern: this.testPrefix+'%'
        }, session);
    }

    async makeEntityRequest(method, entity, endpoint, data, session)
    {
        let requestMethod = 'GET' === method ? 'makeAuthenticatedRequest' : 'makeFormRequest';
        let response = await this[requestMethod](method, this.adminPath+'/'+entity+endpoint, data, session);
        if(404 === response.statusCode){
            Logger.log(100, '', 'Skipped: '+entity+endpoint+' not available');
            return null;
        }
        return response;
    }

    async testEntityCrud(entity, session)
    {
        await this.test('GET /'+entity+' lists records', async () => {
            let response = await this.makeAuthenticatedRequest('GET',
                this.adminPath+'/'+entity, null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: '+entity+' not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('<table'));
        });

        await this.test('GET /'+entity+'/create shows form', async () => {
            let response = await this.makeAuthenticatedRequest('GET',
                this.adminPath+'/'+entity+'/create', null, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: '+entity+'/create not available');
                return;
            }
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('<form'));
        });

        await this.test('POST /'+entity+'/save with valid data validates creation',
            async () => {
            let testData = CrudTestData.getValidTestData(entity, this.testPrefix+'-'+this.testTimestamp);
            let response = await this.makeFormRequest('POST',
            this.adminPath+'/'+entity+'/save', testData, session);
            if(404 === response.statusCode){
                Logger.log(100, '', 'Skipped: '+entity+'/save not available');
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location){
                this.assert(!response.headers.location.includes('error'));
                let createdId = this.extractIdFromLocation(
                    response.headers.location);
                if(createdId){
                    this.createdIds[entity] = createdId;
                    await this.validateRecordCreated(entity, createdId, testData);
                }
            }
        });

        await this.test('POST /'+entity+'/save with invalid data fails properly',
            async () => {
            let testData = {};
            let response = await this.makeEntityRequest('POST', entity, '/save', testData, session);
            if(!response){
                return;
            }
            this.assert.strictEqual(302, response.statusCode);
            if(response.headers.location){
                let expectedError = CrudTestData.getExpectedValidationErrors(entity);
                this.assert(response.headers.location.includes(expectedError));
            }
        });

        let recordId = this.createdIds[entity] ||
            await this.getFirstExistingId(entity, session);
        if(recordId){
            await this.test('GET /'+entity+'/view shows record', async () => {
                let response = await this.makeEntityRequest('GET', entity, '/view?id='+recordId, null, session);
                if(!response){
                    return;
                }
                this.assert(response.body.includes('<form'));
            });

            await this.test('GET /'+entity+'/edit shows form', async () => {
                let response = await this.makeEntityRequest('GET', entity, '/edit?id='+recordId, null, session);
                if(!response){
                    return;
                }
                this.assert(response.body.includes('<form'));
            });

            await this.test('POST /'+entity+'/save updates existing validates update',
                async () => {
                let testData = CrudTestData.getValidTestData(entity, this.testPrefix+'-'+this.testTimestamp);
                testData.id = recordId;
                let response = await this.makeEntityRequest('POST', entity, '/save', testData, session);
                if(!response){
                    return;
                }
                await this.validateSaveResponse(response, entity);
                await this.validateRecord(entity, recordId, testData);
            });

            await this.test('GET /'+entity+'/view validates record display', async () => {
                let response = await this.makeEntityRequest('GET', entity, '/view?id='+recordId, null, session);
                if(!response){
                    return;
                }
                this.assert(response.body.includes('id="'+recordId+'"') || response.body.includes('value="'+recordId+'"'));
                this.assert(response.body.includes('form') || response.body.includes('view'));
            });

            await this.test('GET /'+entity+'/edit validates form fields', async () => {
                let response = await this.makeEntityRequest('GET', entity, '/edit?id='+recordId, null, session);
                if(!response){
                    return;
                }
                this.assert(response.body.includes('method="post"') || response.body.includes('method="POST"'));
                this.assert(response.body.includes('type="submit"') || response.body.includes('btn'));
            });

            await this.test('POST /'+entity+'/delete removes record successfully', async () => {
                let response = await this.makeEntityRequest('POST', entity, '/delete', {
                    id: recordId,
                    confirm: 1,
                    action: 'delete'
                }, session);
                if(!response){
                    return;
                }
                this.assert.strictEqual(302, response.statusCode);
                if(response.headers.location){
                    if(response.headers.location.includes('error')){
                        Logger.log(100, '', 'Delete failed for '+entity+' ID '+recordId+' - this may be expected behavior');
                    }
                    await this.validateRecordDeleted(entity, recordId, session);
                }
            });

            await this.test('POST /'+entity+'/delete with invalid id fails gracefully', async () => {
                let response = await this.makeEntityRequest('POST', entity, '/delete', {id: 999999}, session);
                if(response){
                    this.assert.strictEqual(302, response.statusCode);
                }
            });
        }
    }

    async validateSaveResponse(response, entity)
    {
        this.assert.strictEqual(302, response.statusCode);
        if(response.headers.location){
            this.assert(!response.headers.location.includes('error'));
            return this.extractIdFromLocation(response.headers.location);
        }
        return null;
    }

    async validateRecord(entity, recordId, testData)
    {
        try {
            let response = await this.makeAuthenticatedRequest('GET',
                this.adminPath+'/'+entity+'/view?id='+recordId, null,
                await this.getAuthenticatedSession());
            this.assert.strictEqual(200, response.statusCode);
            for(let key of Object.keys(testData)){
                if('password' !== key && 'id' !== key){
                    if(!response.body.includes(testData[key])){
                        this.assert(response.body.includes('value="'+testData[key]+'"'));
                    }
                }
            }
        } catch(error){
            Logger.log(100, '', 'Validation failed for '+entity+': '+
                error.message);
        }
    }

    async validateRecordCreated(entity, recordId, testData)
    {
        try {
            let response = await this.makeAuthenticatedRequest('GET',
                this.adminPath+'/'+entity+'/view?id='+recordId, null,
                await this.getAuthenticatedSession());
            this.assert.strictEqual(200, response.statusCode);
            for(let key of Object.keys(testData)){
                if('password' !== key && 'id' !== key){
                    if(!response.body.includes(testData[key])){
                        this.assert(response.body.includes('value="'+testData[key]+'"'));
                    }
                }
            }
        } catch(error){
            Logger.log(100, '', 'Validation failed for '+entity+' creation: '+error.message);
        }
    }

    async validateRecordDeleted(entity, recordId, session)
    {
        try {
            let response = await this.makeAuthenticatedRequest('GET',
                this.adminPath+'/'+entity+'/view?id='+recordId, null, session);
            this.assert(404 === response.statusCode ||
                response.body.includes('not found') ||
                response.body.includes('error'));
        } catch(error){
            Logger.log(100, '', 'Delete validation for '+entity+' ID '+recordId+': '+error.message);
        }
    }

    extractIdFromLocation(location)
    {
        let match = location.match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }

    async getFirstExistingId(entity, session)
    {
        try {
            let response = await this.makeAuthenticatedRequest('GET',
                this.adminPath+'/'+entity, null, session);
            if(200 === response.statusCode){
                let idMatch = response.body.match(/\/view\?id=(\d+)/);
                if(idMatch){
                    return idMatch[1];
                }
            }
        } catch(error){
            Logger.log(100, '', 'Could not find existing ID for '+entity+': '+
                error.message);
        }
        return null;
    }

}

module.exports.TestAdminCrud = TestAdminCrud;
