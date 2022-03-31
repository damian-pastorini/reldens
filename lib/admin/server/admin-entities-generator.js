/**
 *
 * Reldens - AdminEntitiesGenerator
 *
 */

const { Logger } = require('@reldens/utils');

class AdminEntitiesGenerator
{

    static generateEntities(loadedEntities, generatedDrivers)
    {
        let rawEntitiesKeys = Object.keys(loadedEntities);
        let driverEntitiesKeys = Object.keys(generatedDrivers);
        if(rawEntitiesKeys.length !== driverEntitiesKeys.length){
            Logger.error('Raw entities and driver entities mismatch.', rawEntitiesKeys, driverEntitiesKeys);
            return {};
        }
        let generatedEntities = {};
        for(let i of rawEntitiesKeys){
            generatedEntities[i] = {
                rawEntity: generatedDrivers[i],
                config: loadedEntities[i].config
            }
        }
        return generatedEntities;
    }

}

module.exports.AdminEntitiesGenerator = AdminEntitiesGenerator;
