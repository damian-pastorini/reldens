/**
 *
 * Reldens - TestAdminCrud
 *
 */

const { BaseTest } = require('./base-test');
const { Logger } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { CrudTestData } = require('./fixtures/crud-test-data');
const { EntitiesList } = require('./fixtures/entities-list');

class TestAdminCrud extends BaseTest
{
    constructor(config)
    {
        super(config);
        this.entitiesWithoutRequiredFK = EntitiesList.getEntitiesWithoutRequiredFK();
        this.entitiesWithRequiredFK = EntitiesList.getEntitiesWithRequiredFK();
        this.entitiesWithUploadsButNoRequiredFK = EntitiesList.getEntitiesWithUploadsButNoRequiredFK();
        this.entitiesWithUploadsAndRequiredFK = EntitiesList.getEntitiesWithUploadsAndRequiredFK();
        this.testPrefix = CrudTestData.getTestPrefix();
        this.createdIds = {};
        this.testRecordsForCleanup = [];
        this.baseTestIds = CrudTestData.getBaseTestIds();
        this.serverPath = config.serverPath || null;
        this.themeName = config.themeName || 'default';
        this.testFiles = [];
    }

    async testEntityCrudWithoutFK()
    {
        Logger.log(100, '', 'Running CRUD tests for entities without required FK');
        let session = await this.getAuthenticatedSession();
        if(!session){
            return;
        }
        await this.preCleanup(session);
        for(let entity of this.entitiesWithoutRequiredFK){
            await this.runEntityCrudFlow(entity, session, 'withoutFK');
        }
        await this.cleanup();
    }

    async testEntityCrudWithRequiredFK()
    {
        Logger.log(100, '', 'Running CRUD tests for entities with required FK');
        let session = await this.getAuthenticatedSession();
        if(!session){
            return;
        }
        await this.preCleanup(session);
        for(let entity of this.entitiesWithRequiredFK){
            await this.runEntityCrudFlow(entity, session, 'withRequiredFK');
        }
        await this.cleanup();
    }

    async testEntityCrudWithUploadsNoFK()
    {
        if(!this.serverPath){
            return;
        }
        Logger.log(100, '', 'Running CRUD tests for entities with uploads but no required FK');
        let session = await this.getAuthenticatedSession();
        if(!session){
            return;
        }
        await this.preCleanup(session);
        for(let entity of this.entitiesWithUploadsButNoRequiredFK){
            await this.runEntityCrudFlowWithUploads(entity, session, 'withUploadsNoFK');
        }
        await this.cleanup();
    }

    async testEntityCrudWithUploadsAndFK()
    {
        if(!this.serverPath){
            return;
        }
        Logger.log(100, '', 'Running CRUD tests for entities with uploads and required FK');
        let session = await this.getAuthenticatedSession();
        if(!session){
            return;
        }
        await this.preCleanup(session);
        for(let entity of this.entitiesWithUploadsAndRequiredFK){
            await this.runEntityCrudFlowWithUploads(entity, session, 'withUploadsAndFK');
        }
        await this.cleanup();
    }

    async runEntityCrudFlow(entity, session, type)
    {
        Logger.log(100, '', 'Testing entity '+type+': '+entity);
        await this.runEntityList(entity, session, 'initially');
        let createdRecordId = await this.runEntityCreate(entity, session, 'main');
        await this.runEntityList(entity, session, 'after creation');
        await this.runEntityListWithFilters(entity, session);
        await this.runEntityEdit(entity, session, createdRecordId, 'edit');
        await this.runEntityDeleteAndEditFlows(entity, session, createdRecordId);
    }

    async runEntityCrudFlowWithUploads(entity, session, type)
    {
        Logger.log(100, '', 'Testing entity '+type+': '+entity);
        await this.runEntityList(entity, session, 'initially');
        let createdRecordId = await this.runEntityCreate(entity, session, 'main');
        await this.runEntityCreateWithUpload(entity, session, 'upload');
        await this.runEntityList(entity, session, 'after creation');
        await this.runEntityListWithFilters(entity, session);
        await this.runEntityEdit(entity, session, createdRecordId, 'edit');
        await this.runEntityEditWithUpload(entity, session, createdRecordId, 'edit-upload');
        await this.runEntityDeleteAndEditFlows(entity, session, createdRecordId);
    }

    async runEntityDeleteAndEditFlows(entity, session, createdRecordId)
    {
        let deleteTestRecordId = await this.runEntityCreateForDelete(entity, session);
        await this.runEntityDelete(entity, session, deleteTestRecordId);
        await this.runEntityCreateWithInvalidData(entity, session);
        let editFailTestRecordId = await this.runEntityCreateForEditFail(entity, session);
        await this.runEntityEditWithInvalidData(entity, session, editFailTestRecordId);
        await this.runEntityView(entity, session, createdRecordId);
        await this.runEntityEditForm(entity, session, createdRecordId);
    }

    async preCleanup(session)
    {
        try {
            await this.makeFormRequest(
                'POST',
                this.adminPath+'/config/bulk-delete',
                {scope: 'test', pathPattern: this.testPrefix+'%', confirm: 1, action: 'bulk_delete'},
                session
            );
        } catch(error){
            Logger.log(100, '', 'Pre-cleanup failed: '+error.message);
        }
    }

    async runEntityList(entity, session, context)
    {
        await this.test(entity+' - List records '+context, async () => {
            let response = await this.makeAuthenticatedRequest('GET', this.adminPath+'/'+entity, null, session);
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('<table class="list">'));
            this.assert(response.body.includes('<div class="entity-list '+entity+'-list">'));
        });
    }

    async runEntityCreate(entity, session, suffix)
    {
        let createTestData = this.getTestDataForEntity(entity, suffix);
        let createdRecordId = null;
        await this.test(entity+' - Create record with valid data ('+suffix+')', async () => {
            let response = await this.makeEntityRequest('POST', entity, '/save', createTestData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location);
            this.assert(!response.headers.location.includes('error'));
            createdRecordId = this.extractIdFromLocation(response.headers.location, entity);
            this.assert(createdRecordId);
            this.createdIds[entity+'_'+suffix] = createdRecordId;
            this.trackRecordForCleanup(entity, createdRecordId);
        });
        return createdRecordId;
    }

    async runEntityCreateWithUpload(entity, session, suffix)
    {
        let hasUploadFields = CrudTestData.getUploadFieldsForEntity(entity).length > 0;
        if(!hasUploadFields){
            return;
        }
        await this.test(entity+' - Create record with file upload ('+suffix+')', async () => {
            let uploadTestData = this.getTestDataForEntity(entity, suffix);
            let response = await this.makeEntityRequest('POST', entity, '/save', uploadTestData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(!response.headers.location.includes('error'));
            let uploadRecordId = this.extractIdFromLocation(response.headers.location, entity);
            this.trackRecordForCleanup(entity, uploadRecordId);
        });
    }

    async runEntityListWithFilters(entity, session)
    {
        await this.test(entity+' - List records with filters', async () => {
            let createTestData = this.getTestDataForEntity(entity, 'filter');
            let filterParams = this.getFilterParams(entity, createTestData);
            let response = await this.makeAuthenticatedRequest(
                'GET',
                this.adminPath+'/'+entity+'?'+filterParams,
                null,
                session
            );
            this.assert.strictEqual(200, response.statusCode);
        });
    }

    async runEntityEdit(entity, session, recordId, suffix)
    {
        await this.test(entity+' - Edit existing record ('+suffix+')', async () => {
            let editData = this.getTestDataForEntity(entity, suffix);
            let idField = EntitiesList.getEntityIdField(entity);
            editData[idField] = recordId;
            let response = await this.makeEntityRequest('POST', entity, '/save', editData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(!response.headers.location.includes('error'));
        });
    }

    async runEntityEditWithUpload(entity, session, recordId, suffix)
    {
        let hasUploadFields = CrudTestData.getUploadFieldsForEntity(entity).length > 0;
        if(!hasUploadFields){
            return;
        }
        await this.test(entity+' - Edit record with file upload ('+suffix+')', async () => {
            let uploadEditData = this.getTestDataForEntity(entity, suffix);
            let idField = EntitiesList.getEntityIdField(entity);
            uploadEditData[idField] = recordId;
            let response = await this.makeEntityRequest('POST', entity, '/save', uploadEditData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(!response.headers.location.includes('error'));
        });
    }

    async runEntityCreateForDelete(entity, session)
    {
        let deleteTestRecordId = null;
        await this.test(entity+' - Create record for delete test', async () => {
            let deleteTestData = this.getTestDataForEntity(entity, 'delete');
            let response = await this.makeEntityRequest('POST', entity, '/save', deleteTestData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(!response.headers.location.includes('error'));
            deleteTestRecordId = this.extractIdFromLocation(response.headers.location, entity);
            this.assert(deleteTestRecordId);
        });
        return deleteTestRecordId;
    }

    async runEntityDelete(entity, session, recordId)
    {
        await this.test(entity+' - Delete the test record', async () => {
            let idField = EntitiesList.getEntityIdField(entity);
            let response = await this.makeEntityRequest('POST', entity, '/delete', {
                [idField]: recordId,
                confirm: 1,
                action: 'delete'
            }, session);
            this.assert.strictEqual(302, response.statusCode);
            await this.validateRecordDeleted(entity, recordId, session);
        });
    }

    async runEntityCreateWithInvalidData(entity, session)
    {
        let invalidData = CrudTestData.getInvalidTestData(entity);
        if(!invalidData){
            Logger.log(100, '', 'Skipping invalid data test for '+entity+' - no invalid case exists');
            return;
        }
        await this.test(entity+' - Create with missing data (should fail)', async () => {
            let response = await this.makeEntityRequest('POST', entity, '/save', invalidData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(!response.headers.location.includes('success'));
        });
    }

    async runEntityCreateForEditFail(entity, session)
    {
        let editFailTestRecordId = null;
        await this.test(entity+' - Create record for edit fail test', async () => {
            let editFailTestData = this.getTestDataForEntity(entity, 'edit-fail');
            let response = await this.makeEntityRequest('POST', entity, '/save', editFailTestData, session);
            this.assert.strictEqual(302, response.statusCode);
            editFailTestRecordId = this.extractIdFromLocation(response.headers.location, entity);
            this.trackRecordForCleanup(entity, editFailTestRecordId);
        });
        return editFailTestRecordId;
    }

    async runEntityEditWithInvalidData(entity, session, recordId)
    {
        let invalidEditData = CrudTestData.getInvalidTestData(entity);
        if(!invalidEditData){
            Logger.log(100, '', 'Skipping invalid edit test for '+entity+' - no invalid case exists');
            return;
        }
        await this.test(entity+' - Edit with missing data (should fail)', async () => {
            let idField = EntitiesList.getEntityIdField(entity);
            invalidEditData[idField] = recordId;
            let response = await this.makeEntityRequest('POST', entity, '/save', invalidEditData, session);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(!response.headers.location.includes('success'));
        });
    }

    async runEntityView(entity, session, recordId)
    {
        await this.test(entity+' - View record validation', async () => {
            let idField = EntitiesList.getEntityIdField(entity);
            let response = await this.makeAuthenticatedRequest(
                'GET',
                this.adminPath+'/'+entity+'/view?'+idField+'='+recordId,
                null,
                session
            );
            this.assert.strictEqual(200, response.statusCode);
        });
    }

    async runEntityEditForm(entity, session, recordId)
    {
        await this.test(entity+' - Edit form validation', async () => {
            let idField = EntitiesList.getEntityIdField(entity);
            let response = await this.makeAuthenticatedRequest(
                'GET',
                this.adminPath+'/'+entity+'/edit?'+idField+'='+recordId,
                null,
                session
            );
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('<form'));
        });
    }

    getTestDataForEntity(entity, suffix)
    {
        let baseData = CrudTestData.getValidTestData(entity, this.testPrefix, suffix);
        let uploadFields = CrudTestData.getUploadFieldsForEntity(entity);
        for(let field of uploadFields){
            let testFile = this.getTestFileForField(entity, field);
            baseData[field] = {
                filename: testFile.filename,
                filePath: testFile.filePath,
                contentType: testFile.contentType
            };
        }
        return baseData;
    }

    getTestFileForField(entity, field)
    {
        let testFiles = {
            rooms: {
                map_filename: {
                    filename: 'test-file.json',
                    filePath: FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'test-file.json'),
                    contentType: 'application/json'
                },
                scene_images: {
                    filename: 'test-file.png',
                    filePath: FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'test-file.png'),
                    contentType: 'image/png'
                }
            },
            audio: {
                files_name: {
                    filename: 'test-audio.mp3',
                    filePath: FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3'),
                    contentType: 'audio/mpeg'
                }
            },
            'items-item': {
                files_name: {
                    filename: 'test-file.png',
                    filePath: FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'test-file.png'),
                    contentType: 'image/png'
                }
            },
            objects: {
                asset_file: {
                    filename: 'test-file.png',
                    filePath: FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'test-file.png'),
                    contentType: 'image/png'
                }
            }
        };
        let entityFiles = testFiles[entity];
        if(!entityFiles || !entityFiles[field]){
            return {
                filename: 'test-file.png',
                filePath: FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures', 'test-file.png'),
                contentType: 'image/png'
            };
        }
        return entityFiles[field];
    }

    async makeEntityRequest(method, entity, endpoint, data, session)
    {
        if('GET' === method){
            return await this.makeAuthenticatedRequest(method, this.adminPath+'/'+entity+endpoint, data, session);
        }
        if(this.entityHasUploadFields(entity, data)){
            return await this.makeMultipartRequest(method, this.adminPath+'/'+entity+endpoint, data, session);
        }
        return await this.makeFormRequest(method, this.adminPath+'/'+entity+endpoint, data, session);
    }

    entityHasUploadFields(entity, data)
    {
        let uploadFields = CrudTestData.getUploadFieldsForEntity(entity);
        if(!uploadFields.length){
            return false;
        }
        for(let field of uploadFields){
            if(data && data[field]){
                return true;
            }
        }
        return false;
    }

    getFilterParams(entity, testData)
    {
        let filterMappings = {
            rooms: 'name='+encodeURIComponent(testData.name || ''),
            objects: 'object_class_key='+encodeURIComponent(testData.object_class_key || ''),
            'skills-skill': 'key='+encodeURIComponent(testData.key || ''),
            'items-item': 'key='+encodeURIComponent(testData.key || ''),
            ads: 'key='+encodeURIComponent(testData.key || ''),
            audio: 'audio_key='+encodeURIComponent(testData.audio_key || ''),
            config: 'scope='+encodeURIComponent(testData.scope || ''),
            features: 'code='+encodeURIComponent(testData.code || ''),
            users: 'username='+encodeURIComponent(testData.username || '')
        };
        return filterMappings[entity] || 'id='+encodeURIComponent(testData.id || '');
    }

    trackRecordForCleanup(entity, recordId)
    {
        if(!recordId){
            return;
        }
        this.testRecordsForCleanup.push({entity: entity, id: recordId});
    }

    async cleanup()
    {
        try {
            let session = await this.getAuthenticatedSession();
            if(!session){
                Logger.log(100, '', 'Cannot cleanup - authentication failed');
                return;
            }
            for(let record of this.testRecordsForCleanup){
                try {
                    let idField = EntitiesList.getEntityIdField(record.entity);
                    await this.makeEntityRequest(
                        'POST',
                        record.entity,
                        '/delete',
                        {[idField]: record.id, confirm: 1, action: 'delete'},
                        session
                    );
                } catch(error){
                    Logger.log(100, '', 'Cleanup failed for '+record.entity+' ID '+record.id+': '+error.message);
                }
            }
            await this.cleanupConfigTestData(session);
            Logger.log(100, '', 'Database cleanup completed');
        } catch(error){
            Logger.log(100, '', 'Database cleanup failed: '+error.message);
        }
    }

    async cleanupConfigTestData(session)
    {
        try {
            await this.makeFormRequest(
                'POST',
                this.adminPath+'/config/bulk-delete',
                {scope: 'test', pathPattern: this.testPrefix+'%', confirm: 1, action: 'bulk_delete'},
                session
            );
        } catch(error){
            Logger.log(100, '', 'Config cleanup failed: '+error.message);
        }
    }

    async validateRecordDeleted(entity, recordId, session)
    {
        let idField = EntitiesList.getEntityIdField(entity);
        let response = await this.makeAuthenticatedRequest(
            'GET',
            this.adminPath+'/'+entity+'/view?'+idField+'='+recordId,
            null,
            session
        );
        this.assert.strictEqual(200, response.statusCode);
        this.assert(response.body.includes('<!DOCTYPE html>'));
    }

    extractIdFromLocation(location, entity)
    {
        if(!location){
            return null;
        }
        let idField = EntitiesList.getEntityIdField(entity);
        let customIdMatch = location.match(new RegExp('[?&]'+idField+'=(\\d+)'));
        if(customIdMatch){
            return customIdMatch[1];
        }
        let match = location.match(/[?&]id=(\d+)/);
        if(!match){
            match = location.match(/\/(\d+)(?:[?&]|$)/);
        }
        if(!match){
            match = location.match(/success.*?(\d+)/);
        }
        return match ? match[1] : null;
    }

}

module.exports.TestAdminCrud = TestAdminCrud;
