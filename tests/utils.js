/**
 *
 * Reldens - Utils
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { EntitiesList } = require('./fixtures/entities-list');

class Utils
{

    static async cleanupTestFiles(paths)
    {
        for(let path of paths){
            FileHandler.remove(path);
        }
    }

    static async verifyDatabaseRecord(dataServer, entityName, filters)
    {
        let entity = dataServer.getEntity(entityName);
        if(!entity){
            return false;
        }
        let result = await entity.loadOne(filters);
        return null !== result;
    }

    static async beginTransaction(dataServer)
    {
        if(!dataServer){
            return false;
        }
        await dataServer.rawQuery('START TRANSACTION');
        return true;
    }

    static async rollbackTransaction(dataServer)
    {
        if(!dataServer){
            return false;
        }
        await dataServer.rawQuery('ROLLBACK');
        return true;
    }

    static async cleanupTestData(dataServer, testPrefix)
    {
        if(!dataServer || !testPrefix){
            return 0;
        }
        let cleanedRecords = 0;
        try {
            let cleanupQueries = [
                'DELETE FROM config WHERE scope = "test" AND path LIKE "'+testPrefix+'%"',
                'DELETE FROM rooms WHERE name LIKE "'+testPrefix+'%"',
                'DELETE FROM objects WHERE object_class_key LIKE "'+testPrefix+'%"',
                'DELETE FROM skills WHERE key LIKE "'+testPrefix+'%"',
                'DELETE FROM items WHERE key LIKE "'+testPrefix+'%"',
                'DELETE FROM ads WHERE ads_key LIKE "'+testPrefix+'%"',
                'DELETE FROM audio WHERE audio_key LIKE "'+testPrefix+'%"',
                'DELETE FROM features WHERE code LIKE "'+testPrefix+'%"',
                'DELETE FROM rewards WHERE key LIKE "'+testPrefix+'%"',
                'DELETE FROM snippets WHERE key LIKE "'+testPrefix+'%"',
                'DELETE FROM teams WHERE key LIKE "'+testPrefix+'%"',
                'DELETE FROM users WHERE username LIKE "'+testPrefix+'%" OR email LIKE "'+testPrefix+'%"'
            ];
            for(let query of cleanupQueries){
                let result = await dataServer.rawQuery(query);
                if(result && result.affectedRows){
                    cleanedRecords += result.affectedRows;
                }
            }
            return cleanedRecords;
        } catch(error){
            return 0;
        }
    }

    static async cleanupTestDataByTimestamp(dataServer, testTimestamp)
    {
        if(!dataServer || !testTimestamp){
            return 0;
        }
        try {
            let query = 'DELETE FROM config WHERE scope = "test" AND path LIKE "%'+testTimestamp+'%"';
            let result = await dataServer.rawQuery(query);
            return result && result.affectedRows ? result.affectedRows : 0;
        } catch(error){
            return 0;
        }
    }

    static async createTestSnapshot(dataServer)
    {
        if(!dataServer){
            return {};
        }
        let snapshot = {};
        let entities = EntitiesList.getAll();
        for(let entityName of entities){
            let results = await dataServer.rawQuery('SELECT COUNT(*) as count FROM '+entityName);
            snapshot[entityName] = results[0].count;
        }
        return snapshot;
    }

    static async restoreTestSnapshot(dataServer, snapshot, currentSnapshot)
    {
        if(!dataServer || !snapshot || !currentSnapshot){
            return false;
        }
        for(let entityName of Object.keys(snapshot)){
            let originalCount = snapshot[entityName];
            let currentCount = currentSnapshot[entityName];
            if(currentCount > originalCount){
                let deleteCount = currentCount - originalCount;
                await dataServer.rawQuery('DELETE FROM '+entityName+' ORDER BY id DESC LIMIT '+deleteCount);
            }
        }
        return true;
    }

}

module.exports.Utils = Utils;
