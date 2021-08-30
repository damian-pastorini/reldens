/**
 *
 * Reldens - EntitiesLoader
 *
 */

const fs = require('fs');
const path = require('path');
const { sc } = require('@reldens/utils');

class EntitiesLoader
{

    static loadEntities(projectRoot, withConfig=false, withTranslations = false)
    {
        let packages = path.join(projectRoot, 'node_modules', 'reldens', 'packages');
        let files = [];
        this.getFiles(packages, files);
        let entities = {};
        let translations = {};
        for(let file of files){
            let classPath = file.replace('.js', '');
            const {rawRegisteredEntities, entitiesConfig, entitiesTranslations} = require(classPath);
            // @TODO: TEMPORAL CONFIG CONDITION, REMOVE THIS IF!!!
            if(!rawRegisteredEntities || (withConfig && !entitiesConfig)){
                continue;
            }
            let exportedEntitiesList = Object.keys(rawRegisteredEntities);
            if(exportedEntitiesList.length){
                for(let i of exportedEntitiesList){
                    // @TODO: TEMPORAL, REMOVE THIS IF!!!
                    if(withConfig && !sc.hasOwn(entitiesConfig, i)){
                        continue;
                    }
                    entities[i] = withConfig ?
                        {rawEntity: rawRegisteredEntities[i], config: (entitiesConfig[i] || {})} :
                        rawRegisteredEntities[i];
                    if(withTranslations && entitiesTranslations && Object.keys(entitiesTranslations).length){
                        Object.assign(translations, entitiesTranslations);
                    }
                }
            }
        }
        return {entities, translations};
    }

    static getFiles(path, files)
    {
        fs.readdirSync(path).forEach((file) => {
            let subPath = path+'/'+file;
            if(fs.lstatSync(subPath).isDirectory()){
                this.getFiles(subPath, files);
            } else {
                if(file.indexOf('registered-entities.js') === 0){
                    files.push(subPath);
                }
            }
        });
    }

}

module.exports.EntitiesLoader = EntitiesLoader;
