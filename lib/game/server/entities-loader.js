/**
 *
 * Reldens - EntitiesLoader
 *
 */

const { EntitiesConfigOverrides } = require('../../admin/server/entities-config-override');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class EntitiesLoader
{

    static loadEntities(props)
    {
        if(!sc.isTrue(props, 'reldensModuleLibPath')){
            Logger.error('Plugins path undefined.');
            return false;
        }
        if(!sc.isTrue(props, 'projectRoot')){
            Logger.error('Project root undefined.');
            return false;
        }
        let withConfig = sc.get(props, 'withConfig', false);
        let withTranslations = sc.get(props, 'withTranslations', false);
        let storageDriver = sc.get(props, 'storageDriver', 'objection-js');
        if(!sc.hasOwn(props, 'storageDriver')){
            Logger.info('Storage driver not specified, using objection-js as default.');
        }
        let generatedModelsPath = this.findGeneratedModelsPath(props.projectRoot, storageDriver);
        if(!generatedModelsPath){
            Logger.error('Generated entities not found for driver: '+storageDriver+' - In path: '+generatedModelsPath);
            return false;
        }
        return this.loadFromGeneratedEntities(
            generatedModelsPath,
            props.reldensModuleLibPath,
            withConfig,
            withTranslations,
            storageDriver,
            props
        );
    }

    static findGeneratedModelsPath(projectRoot, storageDriver)
    {
        let generatedEntitiesPath = FileHandler.joinPaths(projectRoot, 'generated-entities');
        if(!FileHandler.exists(generatedEntitiesPath)){
            return false;
        }
        let generatedModelsPath = FileHandler.joinPaths(
            generatedEntitiesPath,
            'models',
            storageDriver,
            'registered-models-'+storageDriver+'.js'
        );
        if(!FileHandler.exists(generatedModelsPath)){
            return false;
        }
        return generatedModelsPath;
    }

    static loadFromGeneratedEntities(
        generatedModelsPath,
        reldensModuleLibPath,
        withConfig,
        withTranslations,
        storageDriver,
        props
    ){
        let classPath = generatedModelsPath.replace('.js', '');
        let {rawRegisteredEntities, entitiesConfig, entitiesTranslations} = require(classPath);
        if(!rawRegisteredEntities){
            Logger.error('Generated entities not found.');
            return false;
        }
        let customConfigOverride = this.loadImplementationConfigOverride(props);
        let mergedOverrideParams = sc.deepMergeProperties(
            Object.assign({}, EntitiesConfigOverrides),
            customConfigOverride
        );
        let pluginData = this.loadPluginData(reldensModuleLibPath, storageDriver);
        let implementationData = this.loadImplementationData(props);
        let mergedConfig = Object.assign({}, entitiesConfig);
        mergedConfig = this.applyEntityOverrides(mergedConfig, pluginData.entityOverrides, mergedOverrideParams, props);
        mergedConfig = this.applyEntityOverrides(
            mergedConfig,
            implementationData.entityOverrides,
            mergedOverrideParams,
            props
        );
        let mergedTranslations = sc.deepMergeProperties(
            Object.assign({}, entitiesTranslations || {}),
            pluginData.translations
        );
        let entities = {};
        let entitiesRaw = {};
        let translations = {};
        for(let key of Object.keys(rawRegisteredEntities)){
            let modelClass = rawRegisteredEntities[key];
            if(sc.hasOwn(pluginData.modelOverrides, key)){
                modelClass = pluginData.modelOverrides[key];
            }
            if(sc.hasOwn(implementationData.modelOverrides, key)){
                modelClass = implementationData.modelOverrides[key];
            }
            entitiesRaw[key] = modelClass;
            entities[key] = withConfig ? {rawEntity: modelClass, config: mergedConfig[key] || {}} : modelClass;
        }
        if(withTranslations){
            Object.assign(translations, mergedTranslations);
        }
        return {entities, entitiesRaw, translations};
    }

    static loadImplementationConfigOverride(props)
    {
        let customClasses = sc.get(props, 'customClasses', false);
        if(!customClasses){
            return {};
        }
        return sc.get(customClasses, 'entitiesConfigOverride', {});
    }

    static applyEntityOverrides(config, overrides, overrideParams, props)
    {
        if(!overrides || 0 === Object.keys(overrides).length){
            return config;
        }
        for(let key of Object.keys(overrides)){
            let override = overrides[key];
            if('function' !== typeof override){
                continue;
            }
            let entityOverrideParams = overrideParams[key] || {};
            config[key] = override.propertiesConfig(entityOverrideParams, props);
        }
        return config;
    }

    static loadPluginData(reldensModuleLibPath, storageDriver)
    {
        let entityOverrides = {};
        let translations = {};
        let modelOverrides = {};
        let pluginFolders = this.discoverPluginFolders(reldensModuleLibPath);
        for(let pluginName of pluginFolders){
            let pluginServerPath = FileHandler.joinPaths(reldensModuleLibPath, pluginName, 'server');
            if(!FileHandler.exists(pluginServerPath)){
                continue;
            }
            this.loadPluginEntityOverrides(pluginServerPath, entityOverrides);
            this.loadPluginTranslations(pluginServerPath, translations);
            this.loadPluginModelOverrides(pluginServerPath, storageDriver, modelOverrides);
        }
        return {entityOverrides, translations, modelOverrides};
    }

    static discoverPluginFolders(reldensModuleLibPath)
    {
        if(!FileHandler.exists(reldensModuleLibPath)){
            Logger.error('Plugins path does not exist: '+reldensModuleLibPath);
            return [];
        }
        let subFolders = FileHandler.fetchSubFoldersList(reldensModuleLibPath);
        if(!subFolders || 0 === subFolders.length){
            Logger.warning('No plugin folders found in: '+reldensModuleLibPath);
            return [];
        }
        return subFolders;
    }

    static loadPluginEntityOverrides(pluginServerPath, entityOverrides)
    {
        let configPath = FileHandler.joinPaths(pluginServerPath, 'entities-config.js');
        if(!FileHandler.exists(configPath)){
            return;
        }
        let {entitiesConfig} = require(configPath);
        if(!entitiesConfig){
            return;
        }
        Object.assign(entityOverrides, entitiesConfig);
    }

    static loadPluginTranslations(pluginServerPath, translations)
    {
        let transPath = FileHandler.joinPaths(pluginServerPath, 'entities-translations.js');
        if(!FileHandler.exists(transPath)){
            return;
        }
        let {entitiesTranslations} = require(transPath);
        if(!entitiesTranslations){
            return;
        }
        for(let key of Object.keys(entitiesTranslations)){
            if(!translations[key]){
                translations[key] = {};
            }
            Object.assign(translations[key], entitiesTranslations[key]);
        }
    }

    static loadPluginModelOverrides(pluginServerPath, storageDriver, modelOverrides)
    {
        let overridePath = FileHandler.joinPaths(
            pluginServerPath,
            'models',
            storageDriver,
            'overridden-models-'+storageDriver+'.js'
        );
        if(!FileHandler.exists(overridePath)){
            return;
        }
        let {overriddenModels} = require(overridePath);
        if(!overriddenModels){
            return;
        }
        Object.assign(modelOverrides, overriddenModels);
    }

    static loadImplementationData(props)
    {
        let entityOverrides = {};
        let modelOverrides = {};
        let customClasses = sc.get(props, 'customClasses', false);
        if(!customClasses){
            return {entityOverrides, modelOverrides};
        }
        let entitiesConfig = sc.get(customClasses, 'entitiesConfig', false);
        let modelsOverrides = sc.get(customClasses, 'modelsOverrides', false);
        if(entitiesConfig){
            Object.assign(entityOverrides, entitiesConfig);
        }
        if(modelsOverrides){
            Object.assign(modelOverrides, modelsOverrides);
        }
        return {entityOverrides, modelOverrides};
    }

}

module.exports.EntitiesLoader = EntitiesLoader;
