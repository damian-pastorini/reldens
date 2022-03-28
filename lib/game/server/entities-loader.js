/**
 *
 * Reldens - EntitiesLoader
 *
 */

const fs = require('fs');
const { Logger, sc } = require('@reldens/utils');

class EntitiesLoader
{

    static loadEntities(props)
    {
        if(!sc.isTrue(props, 'reldensModuleLibPath')){
            Logger.error('Plugins path undefined.');
            return false;
        }
        let withConfig = sc.get(props, 'withConfig', false);
        let withTranslations = sc.get(props, 'withTranslations', false );
        let files = [];
        let storageDriver = sc.get(props, 'storageDriver', 'objection-js');
        if(!sc.hasOwn(props, 'storageDriver')){
            Logger.info('Storage driver not specified, using objection-js as default.');
        }
        this.getFiles(props.reldensModuleLibPath, files, storageDriver);
        if(0 === files.length){
            Logger.error('None registered-entities files found for the specified storage driver: '+storageDriver);
            return false;
        }
        let entities = {};
        let entitiesRaw = {};
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
                entitiesRaw[i] = rawRegisteredEntities[i];
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
        return {entities, entitiesRaw, translations};
    }

    static getFiles(path, files, storageDriver)
    {
        fs.readdirSync(path).forEach((file) => {
            let subPath = path+'/'+file;
            if(fs.lstatSync(subPath).isDirectory()){
                this.getFiles(subPath, files, storageDriver);
            } else {
                if(0 === file.indexOf('registered-models-'+storageDriver+'.js')){
                    files.push(subPath);
                }
            }
        });
    }

}

module.exports.EntitiesLoader = EntitiesLoader;
