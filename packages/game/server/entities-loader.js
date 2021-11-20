/**
 *
 * Reldens - EntitiesLoader
 *
 */

const fs = require('fs');
const path = require('path');
const { Logger, sc } = require('@reldens/utils');

class EntitiesLoader
{

    static loadEntities(props)
    {
        let projectRoot = props.projectRoot;
        let withConfig = sc.getDef(props, 'withConfig', false);
        let withTranslations = sc.getDef(props, 'withTranslations', false );
        let packages = path.join(projectRoot, 'node_modules', 'reldens', 'packages');
        let files = [];
        let storageDriver = sc.getDef(props, 'storageDriver', 'objection-js');
        if(!sc.hasOwn(props, 'storageDriver')){
            Logger.info('Storage driver not specified, using objection-js as default.');
        }
        this.getFiles(packages, files, storageDriver);
        if(files.length === 0){
            Logger.error('None registered-entities files found for the specified storage driver: '+storageDriver);
            return false;
        }
        let entities = {};
        let translations = {};
        for(let file of files){
            let classPath = file.replace('.js', '');
            let {rawRegisteredEntities, entitiesConfig, entitiesTranslations} = require(classPath);
            let invalidConfig = withConfig && !entitiesConfig;
            if(!rawRegisteredEntities || invalidConfig){
                continue;
            }
            let exportedEntitiesList = Object.keys(rawRegisteredEntities);
            if(!exportedEntitiesList.length){
                continue;
            }
            for(let i of exportedEntitiesList){
                entities[i] = withConfig ?
                    {rawEntity: rawRegisteredEntities[i], config: ((typeof entitiesConfig === 'function'
                        ? entitiesConfig(props)[i]
                        : entitiesConfig[i])
                    || {})}
                    : rawRegisteredEntities[i];
                if(!withTranslations || !entitiesTranslations || !Object.keys(entitiesTranslations).length){
                    continue;
                }
                for(let i of Object.keys(entitiesTranslations)){
                    if(!translations[i]){
                        translations[i] = {};
                    }
                    Object.assign(translations[i], entitiesTranslations[i]);
                }
            }
        }
        return {entities, translations};
    }

    static getFiles(path, files, storageDriver)
    {
        fs.readdirSync(path).forEach((file) => {
            let subPath = path+'/'+file;
            if(fs.lstatSync(subPath).isDirectory()){
                this.getFiles(subPath, files, storageDriver);
            } else {
                if(file.indexOf('registered-entities-'+storageDriver+'.js') === 0){
                    files.push(subPath);
                }
            }
        });
    }

}

module.exports.EntitiesLoader = EntitiesLoader;
