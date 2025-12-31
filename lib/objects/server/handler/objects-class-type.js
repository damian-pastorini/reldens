/**
 *
 * Reldens - ObjectsClassTypeHandler
 *
 * Handles loading and configuring object class types from the database.
 *
 */

const { ObjectTypesClasses } = require('../object/object-types-classes');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('@reldens/storage').BaseDriver } BaseDriver
 */
class ObjectsClassTypeHandler
{

    /**
     * @param {BaseDataServer} dataServer
     */
    constructor(dataServer)
    {
        /** @type {BaseDataServer} */
        this.dataServer = dataServer;
        /** @type {BaseDriver|boolean} */
        this.objectClassTypeRepository = false;
        this.setupRepository();
    }

    /**
     * @returns {boolean}
     */
    setupRepository()
    {
        if(!this.dataServer){
            return false;
        }
        this.objectClassTypeRepository = this.dataServer.getEntity('objectsTypes');
        return true;
    }

    /**
     * @param {Object} configProcessor
     * @returns {Promise<boolean>}
     */
    async setOnConfig(configProcessor)
    {
        if(!configProcessor){
            Logger.warning('Config value undefined for ObjectsClassTypeHandler.');
            return false;
        }
        if(!configProcessor.configList.server.objectsClassTypes){
            configProcessor.configList.server.objectsClassTypes = {};
        }
        let loadedModels = await this.loadObjectClassTypes();
        for(let model of loadedModels){
            configProcessor.configList.server.objectsClassTypes[model.id] = {
                model,
                classInstance: ObjectTypesClasses[model.id]
            };
        }
        return true;
    }

    /**
     * @returns {Promise<Array<Object>|false>}
     */
    async loadObjectClassTypes()
    {
        if(!this.objectClassTypeRepository){
            return false;
        }
        return await this.objectClassTypeRepository.loadAll();
    }
}

module.exports.ObjectsClassTypeHandler = ObjectsClassTypeHandler;
