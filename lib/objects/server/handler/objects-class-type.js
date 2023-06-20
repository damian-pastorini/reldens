/**
 *
 * Reldens - ObjectsClassTypeHandler
 *
 */

const { Logger } = require('@reldens/utils');
const {ObjectTypesClasses} = require("../object/object-types-classes");

class ObjectsClassTypeHandler
{

    constructor(dataServer)
    {
        this.dataServer = dataServer;
        this.objectClassTypeRepository = false;
        this.setupRepository();
    }

    setupRepository()
    {
        if(!this.dataServer){
            return false;
        }
        this.objectClassTypeRepository = this.dataServer.getEntity('objectsTypes');
    }

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
    }

    async loadObjectClassTypes()
    {
        if(!this.objectClassTypeRepository){
            return false;
        }
        return await this.objectClassTypeRepository.loadAll();
    }
}

module.exports.ObjectsClassTypeHandler = ObjectsClassTypeHandler;
