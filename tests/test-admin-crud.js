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
        this.assert(session);
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
            let loginResponse = await this.makeRequest('GET', this.adminPath+'/login');
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
            this.assert(session);
            await this.cleanupConfigTestData(session);
            Logger.log(100, '', 'Database cleanup completed');
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
        return await this[requestMethod](method, this.adminPath+'/'+entity+endpoint, data, session);
    }

    async testEntityCrud(entity, session)
    {
        await this.test('GET /'+entity+' lists records', async () => {
            let response = await this.makeAuthenticatedRequest('GET', this.adminPath+'/'+entity, null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('<table'));
        });

        await this.test('GET /'+entity+'/create shows form', async () => {
            let response = await this.makeEntityRequest('GET', entity, '/edit', null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('<form'));
        });

        await this.test('POST /'+entity+'/save with valid data validates creation',
            async () => {
            let testData = CrudTestData.getValidTestData(entity, this.testPrefix+'-'+this.testTimestamp);
            let response = await this.makeEntityRequest('POST', entity, '/save', testData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location);
            this.assert(!response.headers.location.includes('error'));
        });

        await this.test('POST /'+entity+'/save with invalid data fails properly',
            async () => {
            let testData = {};
            let response = await this.makeEntityRequest('POST', entity, '/save', testData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location);
            let expectedError = CrudTestData.getExpectedValidationErrors(entity);
            this.assert(response.headers.location.includes(expectedError));
        });

        await this.test('Create test record for '+entity, async () => {
            let testData = CrudTestData.getValidTestData(entity, this.testPrefix+'-'+this.testTimestamp);
            let response = await this.makeEntityRequest('POST', entity, '/save', testData, session);
            this.assert.strictEqual(302, response.statusCode);
            let recordId = this.extractIdFromLocation(response.headers.location);
            this.assert(recordId);
            this.createdIds[entity] = recordId;
        });

        let recordId = this.createdIds[entity];

        await this.test('GET /'+entity+'/view shows record', async () => {
            let response = await this.makeEntityRequest('GET', entity, '/view?id='+recordId, null, session);
            this.assert.strictEqual(200, response.statusCode);
        });

        await this.test('GET /'+entity+'/edit shows form', async () => {
            let response = await this.makeEntityRequest('GET', entity, '/edit?id='+recordId, null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('<form'));
        });

        await this.test('POST /'+entity+'/save updates existing validates update', async () => {
            let testData = CrudTestData.getValidTestData(entity, this.testPrefix+'-'+this.testTimestamp);
            testData.id = recordId;
            let response = await this.makeEntityRequest('POST', entity, '/save', testData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(!response.headers.location.includes('error'));
            await this.validateRecord(entity, recordId, testData);
        });

        await this.test('GET /'+entity+'/view validates record display', async () => {
            let response = await this.makeEntityRequest('GET', entity, '/view?id='+recordId, null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('id="'+recordId+'"'));
            this.assert(response.body.includes('view'));
        });

        await this.test('GET /'+entity+'/edit validates form fields', async () => {
            let response = await this.makeEntityRequest('GET', entity, '/edit?id='+recordId, null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('method="post"'));
        });

        await this.test('POST /'+entity+'/delete removes record successfully', async () => {
            let response = await this.makeEntityRequest('POST', entity, '/delete', {
                id: recordId,
                confirm: 1,
                action: 'delete'
            }, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location);
            await this.validateRecordDeleted(entity, recordId, session);
        });

        await this.test('POST /'+entity+'/delete with invalid id fails gracefully', async () => {
            let response = await this.makeEntityRequest('POST', entity, '/delete', {id: 999999}, session);
            this.assert.strictEqual(302, response.statusCode);
        });
    }

    async validateRecord(entity, recordId, testData)
    {
        let response = await this.makeAuthenticatedRequest('GET', this.adminPath+'/'+entity+'/view?id='+recordId, null, await this.getAuthenticatedSession());
        this.assert.strictEqual(200, response.statusCode);
        for(let key of Object.keys(testData)){
            this.assert(response.body.includes(testData[key]));
        }
    }

    async validateRecordDeleted(entity, recordId, session)
    {
        let response = await this.makeAuthenticatedRequest('GET', this.adminPath+'/'+entity+'/view?id='+recordId, null, session);
        this.assert.strictEqual(404, response.statusCode);
    }

    extractIdFromLocation(location)
    {
        let match = location.match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }

}

module.exports.TestAdminCrud = TestAdminCrud;
