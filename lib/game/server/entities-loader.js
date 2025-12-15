/**
 *
 * Reldens - EntitiesLoader
 *
 * Static utility class for loading and configuring database entities from generated models. Handles
 * entity discovery, model overrides, configuration merging, translations loading, and plugin-based
 * entity customization. Supports multiple storage drivers (ObjectionJS, MikroORM, Prisma) and allows
 * custom entity configurations through plugins and implementation overrides.
 *
 */

const { EntitiesConfigOverrides } = require('../../admin/server/entities-config-override');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class EntitiesLoader
{

    /**
     * @param {Object} props
     * @param {string} props.reldensModuleLibPath
     * @param {string} props.projectRoot
     * @param {boolean} [props.withConfig]
     * @param {boolean} [props.withTranslations]
     * @param {string} [props.storageDriver]
     * @param {Object} [props.customClasses]
     * @returns {Object|false} Object with entities, entitiesRaw, and translations, or false if loading fails
     */
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
        let storageDriver = sc.get(props, 'storageDriver', sc.get(process?.env, 'RELDENS_STORAGE_DRIVER', 'prisma'));
        if(!sc.hasOwn(props, 'storageDriver')){
            Logger.info('Storage driver not specified, using '+storageDriver+' as default.');
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

    /**
     * @param {string} projectRoot
     * @param {string} storageDriver
     * @returns {string|false} Path to the registered models file, or false if not found
     */
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

    /**
     * @param {string} generatedModelsPath
     * @param {string} reldensModuleLibPath
     * @param {boolean} withConfig
     * @param {boolean} withTranslations
     * @param {string} storageDriver
     * @param {Object} props
     * @returns {Object} Object with entities, entitiesRaw, and translations
     */
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
        let mergedConfig = sc.deepMergeProperties(Object.assign({}, entitiesConfig), mergedOverrideParams);
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

    /**
     * @param {Object} props
     * @returns {Object} Entities configuration override object
     */
    static loadImplementationConfigOverride(props)
    {
        let customClasses = sc.get(props, 'customClasses', false);
        if(!customClasses){
            return {};
        }
        return sc.get(customClasses, 'entitiesConfigOverride', {});
    }

    /**
     * @param {Object} config
     * @param {Object} overrides
     * @param {Object} overrideParams
     * @param {Object} props
     * @returns {Object} Updated configuration with applied overrides
     */
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

    /**
     * @param {string} reldensModuleLibPath
     * @param {string} storageDriver
     * @returns {Object} Object with entityOverrides, translations, and modelOverrides from all plugins
     */
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

    /**
     * @param {string} reldensModuleLibPath
     * @returns {Array<string>} Array of plugin folder names
     */
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

    /**
     * @param {string} pluginServerPath
     * @param {Object} entityOverrides
     */
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

    /**
     * @param {string} pluginServerPath
     * @param {Object} translations
     */
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

    /**
     * @param {string} pluginServerPath
     * @param {string} storageDriver
     * @param {Object} modelOverrides
     */
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

    /**
     * @param {Object} props
     * @returns {Object} Object with entityOverrides and modelOverrides from implementation
     */
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
