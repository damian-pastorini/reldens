/**
 *
 * Reldens - GenerateCompleteComparison
 *
 */

const { GenerateEntitiesFixtures } = require('./generate-entities-fixtures');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class GenerateCompleteComparison
{
    async generate()
    {
        Logger.info('Starting complete comparison analysis...');
        let projectRoot = FileHandler.joinPaths(__dirname, '..', '..', '..');
        let reldensModuleLibPath = FileHandler.joinPaths(__dirname, '..', '..', 'lib');
        let generatedEntitiesPath = FileHandler.joinPaths(projectRoot, 'src', 'generated-entities');
        let report = {
            timestamp: new Date().toISOString(),
            pluginAnalysis: {},
            dependencyAnalysis: {},
            fixtureComparison: {},
            relationMappingsComparison: {},
            errors: {},
            summary: {}
        };
        report.pluginAnalysis = await this.analyzeAllPlugins(reldensModuleLibPath, generatedEntitiesPath);
        report.dependencyAnalysis = await this.analyzeDependencies(projectRoot);
        report.fixtureComparison = await this.compareFixtures(projectRoot);
        report.relationMappingsComparison = await this.compareRelationMappings(reldensModuleLibPath, generatedEntitiesPath);
        report.errors = this.generateMissingCustomizations(report);
        report.summary = this.generateSummary(report);
        let outputPath = FileHandler.joinPaths(__dirname, 'complete-comparison-report.json');
        FileHandler.writeFile(outputPath, JSON.stringify(report, null, 2));
        Logger.info('Complete comparison report generated: '+outputPath);
        return report;
    }

    async analyzeAllPlugins(reldensModuleLibPath, generatedEntitiesPath)
    {
        let pluginPaths = [
            'actions', 'admin', 'ads', 'audio', 'chat', 'config', 'features', 'inventory',
            'objects', 'respawn', 'rewards', 'rooms', 'scores', 'snippets', 'teams', 'users'
        ];
        let pluginAnalysis = {};
        for(let pluginName of pluginPaths){
            pluginAnalysis[pluginName] = await this.analyzePlugin(pluginName, reldensModuleLibPath, generatedEntitiesPath);
        }
        return pluginAnalysis;
    }

    async analyzePlugin(pluginName, reldensModuleLibPath, generatedEntitiesPath)
    {
        let pluginPath = FileHandler.joinPaths(reldensModuleLibPath, pluginName, 'server');
        let entitiesPath = FileHandler.joinPaths(pluginPath, 'entities');
        let modelsPath = FileHandler.joinPaths(pluginPath, 'models', 'objection-js');
        let analysis = {
            pluginName: pluginName,
            hasEntities: FileHandler.exists(entitiesPath),
            hasModels: FileHandler.exists(modelsPath),
            entities: [],
            models: [],
            entitiesAnalysis: [],
            modelsAnalysis: []
        };
        if(analysis.hasEntities){
            analysis.entities = this.getFilesInFolder(entitiesPath, '.js');
            for(let entityFile of analysis.entities){
                if('entities-config.js' === entityFile || 'entities-translations.js' === entityFile){
                    continue;
                }
                let entityAnalysis = await this.analyzeEntityFile(
                    FileHandler.joinPaths(entitiesPath, entityFile),
                    generatedEntitiesPath
                );
                analysis.entitiesAnalysis.push(entityAnalysis);
            }
        }
        if(analysis.hasModels){
            analysis.models = this.getFilesInFolder(modelsPath, '.js');
            for(let modelFile of analysis.models){
                if('registered-models-objection-js.js' === modelFile || 'overridden-models-objection-js.js' === modelFile){
                    continue;
                }
                let modelAnalysis = await this.analyzeModelFile(
                    FileHandler.joinPaths(modelsPath, modelFile),
                    generatedEntitiesPath
                );
                analysis.modelsAnalysis.push(modelAnalysis);
            }
        }
        return analysis;
    }

    findMatchingFile(files, targetFileName)
    {
        let exactMatch = files.find(f => f.endsWith(targetFileName));
        if(exactMatch){
            return exactMatch;
        }
        let baseName = targetFileName.replace(/-entity\.js$/, '').replace(/-model\.js$/, '');
        let baseNameParts = baseName.split('-');
        for(let file of files){
            let fileBase = file.replace(/-entity\.js$/, '').replace(/-model\.js$/, '');
            let fileBaseParts = fileBase.split('-');
            let matchCount = 0;
            for(let part of baseNameParts){
                if(fileBaseParts.includes(part) || fileBaseParts.includes(part+'s') || fileBaseParts.includes(part.replace(/s$/, ''))){
                    matchCount++;
                }
            }
            if(matchCount >= baseNameParts.length - 1 && matchCount >= baseNameParts.length * 0.8){
                return file;
            }
        }
        return null;
    }

    async analyzeEntityFile(pluginEntityPath, generatedEntitiesPath)
    {
        let entityFileName = FileHandler.getFileName(pluginEntityPath);
        let generatedEntitiesFolder = FileHandler.joinPaths(generatedEntitiesPath, 'entities');
        let generatedFiles = this.getFilesInFolder(generatedEntitiesFolder, '.js');
        let matchedFile = this.findMatchingFile(generatedFiles, entityFileName);
        let generatedEntityPath = matchedFile ? FileHandler.joinPaths(generatedEntitiesFolder, matchedFile) : FileHandler.joinPaths(generatedEntitiesFolder, entityFileName);
        let analysis = {
            fileName: entityFileName,
            pluginEntityPath: pluginEntityPath,
            generatedEntityPath: generatedEntityPath,
            generatedExists: matchedFile ? true : false,
            pluginMethods: [],
            generatedMethods: [],
            missingInGenerated: [],
            error: null
        };
        try{
            let pluginEntity = require(pluginEntityPath);
            if(!pluginEntity){
                analysis.error = 'Module export is null or undefined';
                Logger.error('Entity file '+entityFileName+' returned null/undefined export');
                return analysis;
            }
            if('object' !== typeof pluginEntity){
                analysis.error = 'Invalid module export type: '+typeof pluginEntity;
                Logger.error('Entity file '+entityFileName+' export is not an object');
                return analysis;
            }
            let keys = Object.keys(pluginEntity);
            if(!keys){
                analysis.error = 'Object.keys returned null/undefined';
                Logger.error('Entity file '+entityFileName+' Object.keys failed');
                return analysis;
            }
            if(0 === keys.length){
                analysis.error = 'No exports found';
                Logger.error('Entity file '+entityFileName+' has no exported keys');
                return analysis;
            }
            let pluginClassName = keys[0];
            let pluginClass = pluginEntity[pluginClassName];
            if(!pluginClass){
                analysis.error = 'Class not found in export at key: '+pluginClassName;
                Logger.error('Entity file '+entityFileName+' class at key '+pluginClassName+' is undefined');
                return analysis;
            }
            analysis.pluginMethods = this.extractMethods(pluginClass);
            if(analysis.generatedExists){
                let generatedEntity = require(generatedEntityPath);
                if(!generatedEntity){
                    Logger.warning('Generated entity '+entityFileName+' returned null/undefined export');
                    return analysis;
                }
                if('object' !== typeof generatedEntity){
                    Logger.warning('Generated entity '+entityFileName+' export is not an object');
                    return analysis;
                }
                let genKeys = Object.keys(generatedEntity);
                if(!genKeys){
                    Logger.warning('Generated entity '+entityFileName+' Object.keys returned null/undefined');
                    return analysis;
                }
                if(0 === genKeys.length){
                    Logger.warning('Generated entity '+entityFileName+' has no exported keys');
                    return analysis;
                }
                let generatedClassName = genKeys[0];
                let generatedClass = generatedEntity[generatedClassName];
                if(!generatedClass){
                    Logger.warning('Generated entity '+entityFileName+' class at key '+generatedClassName+' is undefined');
                    return analysis;
                }
                analysis.generatedMethods = this.extractMethods(generatedClass);
                analysis.missingInGenerated = analysis.pluginMethods.filter(
                    method => !analysis.generatedMethods.includes(method)
                );
            }
        }
        catch(error){
            analysis.error = error.message;
            Logger.error('Failed to analyze entity '+entityFileName+': '+error.message);
        }
        return analysis;
    }

    async analyzeModelFile(pluginModelPath, generatedEntitiesPath)
    {
        let modelFileName = FileHandler.getFileName(pluginModelPath);
        let generatedModelsFolder = FileHandler.joinPaths(generatedEntitiesPath, 'models', 'objection-js');
        let generatedFiles = this.getFilesInFolder(generatedModelsFolder, '.js');
        let matchedFile = this.findMatchingFile(generatedFiles, modelFileName);
        let generatedModelPath = matchedFile ? FileHandler.joinPaths(generatedModelsFolder, matchedFile) : FileHandler.joinPaths(generatedModelsFolder, modelFileName);
        let analysis = {
            fileName: modelFileName,
            pluginModelPath: pluginModelPath,
            generatedModelPath: generatedModelPath,
            generatedExists: matchedFile ? true : false,
            pluginMethods: [],
            generatedMethods: [],
            pluginRelations: [],
            generatedRelations: [],
            missingMethods: [],
            relationsDiff: [],
            error: null
        };
        try{
            let pluginModel = require(pluginModelPath);
            if(!pluginModel){
                analysis.error = 'Module export is null or undefined';
                Logger.error('Model file '+modelFileName+' returned null/undefined export');
                return analysis;
            }
            if('object' !== typeof pluginModel){
                analysis.error = 'Invalid module export type: '+typeof pluginModel;
                Logger.error('Model file '+modelFileName+' export is not an object');
                return analysis;
            }
            let keys = Object.keys(pluginModel);
            if(!keys){
                analysis.error = 'Object.keys returned null/undefined';
                Logger.error('Model file '+modelFileName+' Object.keys failed');
                return analysis;
            }
            if(0 === keys.length){
                analysis.error = 'No exports found';
                Logger.error('Model file '+modelFileName+' has no exported keys');
                return analysis;
            }
            let pluginClassName = keys[0];
            let pluginClass = pluginModel[pluginClassName];
            if(!pluginClass){
                analysis.error = 'Class not found in export at key: '+pluginClassName;
                Logger.error('Model file '+modelFileName+' class at key '+pluginClassName+' is undefined');
                return analysis;
            }
            analysis.pluginMethods = this.extractMethods(pluginClass);
            analysis.pluginRelations = this.extractRelationMappings(pluginClass);
            if(analysis.generatedExists){
                let generatedModel = require(generatedModelPath);
                if(!generatedModel){
                    Logger.warning('Generated model '+modelFileName+' returned null/undefined export');
                    return analysis;
                }
                if('object' !== typeof generatedModel){
                    Logger.warning('Generated model '+modelFileName+' export is not an object');
                    return analysis;
                }
                let genKeys = Object.keys(generatedModel);
                if(!genKeys){
                    Logger.warning('Generated model '+modelFileName+' Object.keys returned null/undefined');
                    return analysis;
                }
                if(0 === genKeys.length){
                    Logger.warning('Generated model '+modelFileName+' has no exported keys');
                    return analysis;
                }
                let generatedClassName = genKeys[0];
                let generatedClass = generatedModel[generatedClassName];
                if(!generatedClass){
                    Logger.warning('Generated model '+modelFileName+' class at key '+generatedClassName+' is undefined');
                    return analysis;
                }
                analysis.generatedMethods = this.extractMethods(generatedClass);
                analysis.generatedRelations = this.extractRelationMappings(generatedClass);
                analysis.missingMethods = analysis.pluginMethods.filter(
                    method => !analysis.generatedMethods.includes(method)
                );
                analysis.relationsDiff = this.compareRelations(analysis.pluginRelations, analysis.generatedRelations);
            }
        }
        catch(error){
            analysis.error = error.message;
            Logger.error('Failed to analyze model '+modelFileName+': '+error.message);
        }
        return analysis;
    }

    extractMethods(classConstructor)
    {
        if(!classConstructor){
            return [];
        }
        let methods = [];
        let prototype = classConstructor.prototype;
        if(prototype){
            let protoProps = Object.getOwnPropertyNames(prototype);
            for(let prop of protoProps){
                if('constructor' === prop){
                    continue;
                }
                if('function' === typeof prototype[prop]){
                    methods.push(prop);
                }
            }
        }
        let staticProps = Object.getOwnPropertyNames(classConstructor);
        for(let prop of staticProps){
            if('length' === prop || 'name' === prop || 'prototype' === prop){
                continue;
            }
            if('function' === typeof classConstructor[prop]){
                methods.push('static:'+prop);
                continue;
            }
        }
        return methods;
    }

    extractRelationMappings(classConstructor)
    {
        if(!classConstructor || !classConstructor.relationMappings){
            return [];
        }
        let relations = [];
        let mappings = classConstructor.relationMappings;
        for(let key of Object.keys(mappings)){
            relations.push({
                key: key,
                relation: mappings[key].relation ? mappings[key].relation.name : 'unknown',
                join: mappings[key].join || {}
            });
        }
        return relations;
    }

    compareRelations(pluginRelations, generatedRelations)
    {
        let diff = {
            onlyInPlugin: [],
            onlyInGenerated: [],
            differentJoins: []
        };
        if(!pluginRelations){
            Logger.error('Plugin relations is undefined in compareRelations');
            return diff;
        }
        if(!generatedRelations){
            Logger.error('Generated relations is undefined in compareRelations');
            return diff;
        }
        for(let pluginRel of pluginRelations){
            if(!pluginRel){
                Logger.error('Plugin relation item is undefined');
                continue;
            }
            let found = generatedRelations.find(gr => gr && gr.key === pluginRel.key);
            if(!found){
                diff.onlyInPlugin.push(pluginRel);
                continue;
            }
            if(JSON.stringify(pluginRel.join) !== JSON.stringify(found.join)){
                diff.differentJoins.push({
                    key: pluginRel.key,
                    pluginJoin: pluginRel.join,
                    generatedJoin: found.join
                });
            }
        }
        for(let generatedRel of generatedRelations){
            if(!generatedRel){
                Logger.error('Generated relation item is undefined');
                continue;
            }
            let found = pluginRelations.find(pr => pr && pr.key === generatedRel.key);
            if(!found){
                diff.onlyInGenerated.push(generatedRel);
            }
        }
        return diff;
    }

    async analyzeDependencies(projectRoot)
    {
        let dependencies = {
            skills: null,
            items: null
        };
        let skillsPath = FileHandler.joinPaths(projectRoot, 'npm-packages', 'reldens-skills', 'lib', 'server', 'storage', 'models', 'objection-js');
        if(FileHandler.exists(skillsPath)){
            dependencies.skills = {
                path: skillsPath,
                models: this.getFilesInFolder(skillsPath, '.js'),
                modelsAnalysis: []
            };
            if(!dependencies.skills.models){
                Logger.error('Failed to read models from skills path: '+skillsPath);
                dependencies.skills.models = [];
            }
            for(let modelFile of dependencies.skills.models){
                if('registered-models-objection-js.js' === modelFile){
                    continue;
                }
                let modelAnalysis = await this.analyzeDependencyModel(
                    FileHandler.joinPaths(skillsPath, modelFile),
                    projectRoot
                );
                dependencies.skills.modelsAnalysis.push(modelAnalysis);
            }
        }
        let itemsPath = FileHandler.joinPaths(projectRoot, 'npm-packages', 'reldens-items', 'lib', 'server', 'storage', 'models', 'objection-js');
        if(FileHandler.exists(itemsPath)){
            dependencies.items = {
                path: itemsPath,
                models: this.getFilesInFolder(itemsPath, '.js'),
                modelsAnalysis: []
            };
            if(!dependencies.items.models){
                Logger.error('Failed to read models from items path: '+itemsPath);
                dependencies.items.models = [];
            }
            for(let modelFile of dependencies.items.models){
                if('registered-models-objection-js.js' === modelFile){
                    continue;
                }
                let modelAnalysis = await this.analyzeDependencyModel(
                    FileHandler.joinPaths(itemsPath, modelFile),
                    projectRoot
                );
                dependencies.items.modelsAnalysis.push(modelAnalysis);
            }
        }
        return dependencies;
    }

    async analyzeDependencyModel(modelPath, projectRoot)
    {
        let modelFileName = FileHandler.getFileName(modelPath);
        let generatedEntitiesPath = FileHandler.joinPaths(projectRoot, 'src', 'generated-entities');
        let generatedModelsFolder = FileHandler.joinPaths(generatedEntitiesPath, 'models', 'objection-js');
        let generatedFiles = this.getFilesInFolder(generatedModelsFolder, '.js');
        let matchedFile = this.findMatchingFile(generatedFiles, modelFileName);
        let generatedModelPath = matchedFile ? FileHandler.joinPaths(generatedModelsFolder, matchedFile) : FileHandler.joinPaths(generatedModelsFolder, modelFileName);
        let analysis = {
            fileName: modelFileName,
            dependencyModelPath: modelPath,
            generatedModelPath: generatedModelPath,
            generatedExists: matchedFile ? true : false,
            dependencyMethods: [],
            generatedMethods: [],
            missingMethods: [],
            dependencyRelations: [],
            generatedRelations: [],
            relationsDiff: [],
            error: null
        };
        try{
            let dependencyModel = require(modelPath);
            if(!dependencyModel){
                analysis.error = 'Module export is null or undefined';
                Logger.error('Dependency model '+modelFileName+' returned null/undefined export');
                return analysis;
            }
            if('object' !== typeof dependencyModel){
                analysis.error = 'Invalid module export type: '+typeof dependencyModel;
                Logger.error('Dependency model '+modelFileName+' export is not an object');
                return analysis;
            }
            let depKeys = Object.keys(dependencyModel);
            if(!depKeys){
                analysis.error = 'Object.keys returned null/undefined';
                Logger.error('Dependency model '+modelFileName+' Object.keys failed');
                return analysis;
            }
            if(0 === depKeys.length){
                analysis.error = 'No exports found';
                Logger.error('Dependency model '+modelFileName+' has no exported keys');
                return analysis;
            }
            let dependencyClassName = depKeys[0];
            let dependencyClass = dependencyModel[dependencyClassName];
            if(!dependencyClass){
                analysis.error = 'Class not found in export at key: '+dependencyClassName;
                Logger.error('Dependency model '+modelFileName+' class at key '+dependencyClassName+' is undefined');
                return analysis;
            }
            analysis.dependencyMethods = this.extractMethods(dependencyClass);
            analysis.dependencyRelations = this.extractRelationMappings(dependencyClass);
            if(analysis.generatedExists){
                let generatedModel = require(generatedModelPath);
                if(!generatedModel){
                    Logger.warning('Generated model '+modelFileName+' returned null/undefined export');
                    return analysis;
                }
                if('object' !== typeof generatedModel){
                    Logger.warning('Generated model '+modelFileName+' export is not an object');
                    return analysis;
                }
                let genKeys = Object.keys(generatedModel);
                if(!genKeys){
                    Logger.warning('Generated model '+modelFileName+' Object.keys returned null/undefined');
                    return analysis;
                }
                if(0 === genKeys.length){
                    Logger.warning('Generated model '+modelFileName+' has no exported keys');
                    return analysis;
                }
                let generatedClassName = genKeys[0];
                let generatedClass = generatedModel[generatedClassName];
                if(!generatedClass){
                    Logger.warning('Generated model '+modelFileName+' class at key '+generatedClassName+' is undefined');
                    return analysis;
                }
                analysis.generatedMethods = this.extractMethods(generatedClass);
                analysis.generatedRelations = this.extractRelationMappings(generatedClass);
                analysis.missingMethods = analysis.dependencyMethods.filter(
                    method => !analysis.generatedMethods.includes(method)
                );
                analysis.relationsDiff = this.compareRelations(analysis.dependencyRelations, analysis.generatedRelations);
            }
        }
        catch(error){
            analysis.error = error.message;
            Logger.error('Failed to analyze dependency model '+modelFileName+': '+error.message);
        }
        return analysis;
    }

    async compareFixtures(projectRoot)
    {
        let oldFixturePath = FileHandler.joinPaths(projectRoot, 'src', 'tests', 'fixtures', 'generated-entities-old.json');
        let newFixturePath = FileHandler.joinPaths(projectRoot, 'src', 'tests', 'fixtures', 'generated-entities-new.json');
        let comparison = {
            oldExists: FileHandler.exists(oldFixturePath),
            newExists: FileHandler.exists(newFixturePath),
            differences: null
        };
        if(!comparison.newExists){
            Logger.warning('New fixture not found. Generating now...');
            let generator = new GenerateEntitiesFixtures();
            await generator.generate('generated-entities-new.json');
            comparison.newExists = true;
        }
        if(comparison.oldExists && comparison.newExists){
            let oldData = JSON.parse(FileHandler.readFile(oldFixturePath));
            let newData = JSON.parse(FileHandler.readFile(newFixturePath));
            let oldEntityKeys = sc.get(oldData, 'entityKeys', []);
            let newEntityKeys = sc.get(newData, 'entityKeys', []);
            let oldStats = sc.get(oldData, 'stats', {});
            let newStats = sc.get(newData, 'stats', {});
            comparison.differences = {
                entitiesCountMatch: sc.get(oldStats, 'entitiesCount', 0) === sc.get(newStats, 'entitiesCount', 0),
                entitiesRawCountMatch: sc.get(oldStats, 'entitiesRawCount', 0) === sc.get(newStats, 'entitiesRawCount', 0),
                translationsCountMatch: sc.get(oldStats, 'translationsCount', 0) === sc.get(newStats, 'translationsCount', 0),
                oldEntityKeys: oldEntityKeys,
                newEntityKeys: newEntityKeys,
                missingInNew: oldEntityKeys.filter(key => !newEntityKeys.includes(key)),
                addedInNew: newEntityKeys.filter(key => !oldEntityKeys.includes(key)),
                configDifferences: this.compareConfigs(
                    sc.get(oldData, 'entities', {}),
                    sc.get(newData, 'entities', {})
                )
            };
        }
        return comparison;
    }

    compareConfigs(oldEntities, newEntities)
    {
        let differences = [];
        if(!oldEntities){
            Logger.error('Old entities is undefined in compareConfigs');
            return differences;
        }
        if(!newEntities){
            Logger.error('New entities is undefined in compareConfigs');
            return differences;
        }
        for(let key of Object.keys(oldEntities)){
            if(!sc.hasOwn(newEntities, key)){
                continue;
            }
            let oldConfig = oldEntities[key].config || {};
            let newConfig = newEntities[key].config || {};
            let diff = this.findConfigDifferences(key, oldConfig, newConfig);
            if(!diff.missingKeys){
                Logger.error('Missing keys array is undefined for entity: '+key);
                continue;
            }
            if(!diff.addedKeys){
                Logger.error('Added keys array is undefined for entity: '+key);
                continue;
            }
            if(diff.missingKeys.length > 0 || diff.addedKeys.length > 0){
                differences.push(diff);
            }
        }
        return differences;
    }

    findConfigDifferences(entityKey, oldConfig, newConfig)
    {
        let diff = {
            entityKey: entityKey,
            missingKeys: [],
            addedKeys: []
        };
        for(let key of Object.keys(oldConfig)){
            if(!sc.hasOwn(newConfig, key)){
                diff.missingKeys.push(key);
            }
        }
        for(let key of Object.keys(newConfig)){
            if(!sc.hasOwn(oldConfig, key)){
                diff.addedKeys.push(key);
            }
        }
        return diff;
    }

    async compareRelationMappings(reldensModuleLibPath, generatedEntitiesPath)
    {
        let comparison = {
            modelsWithRelations: []
        };
        let pluginPaths = [
            'actions', 'admin', 'ads', 'audio', 'chat', 'config', 'features', 'inventory',
            'objects', 'respawn', 'rewards', 'rooms', 'scores', 'snippets', 'teams', 'users'
        ];
        for(let pluginName of pluginPaths){
            let modelsPath = FileHandler.joinPaths(reldensModuleLibPath, pluginName, 'server', 'models', 'objection-js');
            if(!FileHandler.exists(modelsPath)){
                continue;
            }
            let models = this.getFilesInFolder(modelsPath, '.js');
            for(let modelFile of models){
                if('registered-models-objection-js.js' === modelFile || 'overridden-models-objection-js.js' === modelFile){
                    continue;
                }
                let modelPath = FileHandler.joinPaths(modelsPath, modelFile);
                try{
                    let pluginModel = require(modelPath);
                    if(!pluginModel){
                        Logger.warning('Plugin model '+modelFile+' returned null/undefined export, skipping relation comparison');
                        continue;
                    }
                    if('object' !== typeof pluginModel){
                        Logger.warning('Plugin model '+modelFile+' export is not an object, skipping relation comparison');
                        continue;
                    }
                    let keys = Object.keys(pluginModel);
                    if(!keys || 0 === keys.length){
                        Logger.warning('Plugin model '+modelFile+' has no exported keys, skipping relation comparison');
                        continue;
                    }
                    let pluginClassName = keys[0];
                    let pluginClass = pluginModel[pluginClassName];
                    if(!pluginClass){
                        Logger.warning('Plugin model '+modelFile+' class is undefined, skipping relation comparison');
                        continue;
                    }
                    let pluginRelations = this.extractRelationMappings(pluginClass);
                    if(!pluginRelations){
                        Logger.error('extractRelationMappings returned undefined for '+modelFile);
                        continue;
                    }
                    if(pluginRelations.length > 0){
                        let generatedModelPath = FileHandler.joinPaths(generatedEntitiesPath, 'models', 'objection-js', modelFile);
                        let generatedRelations = [];
                        if(FileHandler.exists(generatedModelPath)){
                            try{
                                let generatedModel = require(generatedModelPath);
                                if(!generatedModel){
                                    Logger.warning('Generated model '+modelFile+' returned null/undefined export');
                                }
                                if(generatedModel && 'object' === typeof generatedModel){
                                    let genKeys = Object.keys(generatedModel);
                                    if(genKeys && genKeys.length > 0){
                                        let generatedClassName = genKeys[0];
                                        let generatedClass = generatedModel[generatedClassName];
                                        if(generatedClass){
                                            generatedRelations = this.extractRelationMappings(generatedClass);
                                        }
                                    }
                                }
                            }
                            catch(error){
                                Logger.error('Failed to load generated model '+modelFile+' for relation comparison: '+error.message);
                            }
                        }
                        comparison.modelsWithRelations.push({
                            plugin: pluginName,
                            modelFile: modelFile,
                            pluginRelations: pluginRelations,
                            generatedRelations: generatedRelations,
                            relationsDiff: this.compareRelations(pluginRelations, generatedRelations)
                        });
                    }
                }
                catch(error){
                    Logger.error('Failed to analyze plugin model '+modelFile+' for relations: '+error.message);
                }
            }
        }
        return comparison;
    }

    getFilesInFolder(folderPath, extension)
    {
        if(!FileHandler.exists(folderPath)){
            Logger.warning('Folder does not exist: '+folderPath);
            return [];
        }
        let files = [];
        let contents = FileHandler.readFolder(folderPath);
        if(!contents){
            Logger.error('Failed to read folder: '+folderPath);
            return [];
        }
        for(let item of contents){
            if(item.endsWith(extension)){
                files.push(item);
            }
        }
        return files;
    }

    generateMissingCustomizations(report)
    {
        let errors = {};
        if(!report.pluginAnalysis){
            return errors;
        }
        for(let pluginName of Object.keys(report.pluginAnalysis)){
            let plugin = report.pluginAnalysis[pluginName];
            if(!plugin){
                continue;
            }
            let pluginErrors = {
                entities: {},
                models: {}
            };
            let hasAnyError = false;
            if(plugin.entitiesAnalysis){
                for(let entityAnalysis of plugin.entitiesAnalysis){
                    if(!entityAnalysis){
                        continue;
                    }
                    let entityErrors = {};
                    if(!entityAnalysis.generatedExists){
                        entityErrors.missing = true;
                        hasAnyError = true;
                    }
                    if(entityAnalysis.missingInGenerated && entityAnalysis.missingInGenerated.length > 0){
                        entityErrors.missingMethods = entityAnalysis.missingInGenerated;
                        hasAnyError = true;
                    }
                    if(entityAnalysis.error){
                        entityErrors.error = entityAnalysis.error;
                        hasAnyError = true;
                    }
                    if(Object.keys(entityErrors).length > 0){
                        pluginErrors.entities[entityAnalysis.fileName] = entityErrors;
                    }
                }
            }
            if(plugin.modelsAnalysis){
                for(let modelAnalysis of plugin.modelsAnalysis){
                    if(!modelAnalysis){
                        continue;
                    }
                    let modelErrors = {};
                    if(!modelAnalysis.generatedExists){
                        modelErrors.missing = true;
                        hasAnyError = true;
                    }
                    if(modelAnalysis.missingMethods && modelAnalysis.missingMethods.length > 0){
                        modelErrors.missingMethods = modelAnalysis.missingMethods;
                        hasAnyError = true;
                    }
                    if(modelAnalysis.relationsDiff){
                        if('object' === typeof modelAnalysis.relationsDiff && !Array.isArray(modelAnalysis.relationsDiff)){
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'onlyInPlugin') && modelAnalysis.relationsDiff.onlyInPlugin && modelAnalysis.relationsDiff.onlyInPlugin.length > 0){
                                modelErrors.relationsOnlyInPlugin = modelAnalysis.relationsDiff.onlyInPlugin;
                                hasAnyError = true;
                            }
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'onlyInGenerated') && modelAnalysis.relationsDiff.onlyInGenerated && modelAnalysis.relationsDiff.onlyInGenerated.length > 0){
                                modelErrors.relationsOnlyInGenerated = modelAnalysis.relationsDiff.onlyInGenerated;
                                hasAnyError = true;
                            }
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'differentJoins') && modelAnalysis.relationsDiff.differentJoins && modelAnalysis.relationsDiff.differentJoins.length > 0){
                                modelErrors.relationsDifferentJoins = modelAnalysis.relationsDiff.differentJoins;
                                hasAnyError = true;
                            }
                        }
                    }
                    if(modelAnalysis.error){
                        modelErrors.error = modelAnalysis.error;
                        hasAnyError = true;
                    }
                    if(Object.keys(modelErrors).length > 0){
                        pluginErrors.models[modelAnalysis.fileName] = modelErrors;
                    }
                }
            }
            if(hasAnyError){
                errors[pluginName] = pluginErrors;
            }
        }
        if(report.dependencyAnalysis){
            if(report.dependencyAnalysis.skills && report.dependencyAnalysis.skills.modelsAnalysis){
                let depErrors = {
                    entities: {},
                    models: {}
                };
                let hasAnyError = false;
                for(let modelAnalysis of report.dependencyAnalysis.skills.modelsAnalysis){
                    if(!modelAnalysis){
                        continue;
                    }
                    let modelErrors = {};
                    if(!modelAnalysis.generatedExists){
                        modelErrors.missing = true;
                        hasAnyError = true;
                    }
                    if(modelAnalysis.missingMethods && modelAnalysis.missingMethods.length > 0){
                        modelErrors.missingMethods = modelAnalysis.missingMethods;
                        hasAnyError = true;
                    }
                    if(modelAnalysis.relationsDiff){
                        if('object' === typeof modelAnalysis.relationsDiff && !Array.isArray(modelAnalysis.relationsDiff)){
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'onlyInPlugin') && modelAnalysis.relationsDiff.onlyInPlugin && modelAnalysis.relationsDiff.onlyInPlugin.length > 0){
                                modelErrors.relationsOnlyInPlugin = modelAnalysis.relationsDiff.onlyInPlugin;
                                hasAnyError = true;
                            }
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'onlyInGenerated') && modelAnalysis.relationsDiff.onlyInGenerated && modelAnalysis.relationsDiff.onlyInGenerated.length > 0){
                                modelErrors.relationsOnlyInGenerated = modelAnalysis.relationsDiff.onlyInGenerated;
                                hasAnyError = true;
                            }
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'differentJoins') && modelAnalysis.relationsDiff.differentJoins && modelAnalysis.relationsDiff.differentJoins.length > 0){
                                modelErrors.relationsDifferentJoins = modelAnalysis.relationsDiff.differentJoins;
                                hasAnyError = true;
                            }
                        }
                    }
                    if(modelAnalysis.error){
                        modelErrors.error = modelAnalysis.error;
                        hasAnyError = true;
                    }
                    if(Object.keys(modelErrors).length > 0){
                        depErrors.models[modelAnalysis.fileName] = modelErrors;
                    }
                }
                if(hasAnyError){
                    errors['@reldens/skills'] = depErrors;
                }
            }
            if(report.dependencyAnalysis.items && report.dependencyAnalysis.items.modelsAnalysis){
                let depErrors = {
                    entities: {},
                    models: {}
                };
                let hasAnyError = false;
                for(let modelAnalysis of report.dependencyAnalysis.items.modelsAnalysis){
                    if(!modelAnalysis){
                        continue;
                    }
                    let modelErrors = {};
                    if(!modelAnalysis.generatedExists){
                        modelErrors.missing = true;
                        hasAnyError = true;
                    }
                    if(modelAnalysis.missingMethods && modelAnalysis.missingMethods.length > 0){
                        modelErrors.missingMethods = modelAnalysis.missingMethods;
                        hasAnyError = true;
                    }
                    if(modelAnalysis.relationsDiff){
                        if('object' === typeof modelAnalysis.relationsDiff && !Array.isArray(modelAnalysis.relationsDiff)){
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'onlyInPlugin') && modelAnalysis.relationsDiff.onlyInPlugin && modelAnalysis.relationsDiff.onlyInPlugin.length > 0){
                                modelErrors.relationsOnlyInPlugin = modelAnalysis.relationsDiff.onlyInPlugin;
                                hasAnyError = true;
                            }
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'onlyInGenerated') && modelAnalysis.relationsDiff.onlyInGenerated && modelAnalysis.relationsDiff.onlyInGenerated.length > 0){
                                modelErrors.relationsOnlyInGenerated = modelAnalysis.relationsDiff.onlyInGenerated;
                                hasAnyError = true;
                            }
                            if(sc.hasOwn(modelAnalysis.relationsDiff, 'differentJoins') && modelAnalysis.relationsDiff.differentJoins && modelAnalysis.relationsDiff.differentJoins.length > 0){
                                modelErrors.relationsDifferentJoins = modelAnalysis.relationsDiff.differentJoins;
                                hasAnyError = true;
                            }
                        }
                    }
                    if(modelAnalysis.error){
                        modelErrors.error = modelAnalysis.error;
                        hasAnyError = true;
                    }
                    if(Object.keys(modelErrors).length > 0){
                        depErrors.models[modelAnalysis.fileName] = modelErrors;
                    }
                }
                if(hasAnyError){
                    errors['@reldens/items-system'] = depErrors;
                }
            }
        }
        if(report.fixtureComparison && report.fixtureComparison.differences){
            let diff = report.fixtureComparison.differences;
            if(diff.configDifferences && diff.configDifferences.length > 0){
                if(!errors._configDifferences){
                    errors._configDifferences = {};
                }
                for(let configDiff of diff.configDifferences){
                    errors._configDifferences[configDiff.entityKey] = {
                        missingKeys: configDiff.missingKeys || [],
                        addedKeys: configDiff.addedKeys || []
                    };
                }
            }
        }
        return errors;
    }

    generateSummary(report)
    {
        let summary = {
            totalPlugins: 0,
            pluginsWithEntities: 0,
            pluginsWithModels: 0,
            totalEntityFiles: 0,
            totalModelFiles: 0,
            entitiesMissingInGenerated: 0,
            modelsMissingInGenerated: 0,
            modelsWithMissingMethods: 0,
            modelsWithRelationDifferences: 0,
            dependenciesFound: {
                skills: report.dependencyAnalysis.skills !== null,
                items: report.dependencyAnalysis.items !== null
            },
            fixtureComparison: null
        };
        if(sc.hasOwn(report.fixtureComparison, 'differences') && report.fixtureComparison.differences){
            let differences = report.fixtureComparison.differences;
            summary.fixtureComparison = {
                entitiesCountMatch: sc.get(differences, 'entitiesCountMatch', false),
                missingInNew: sc.get(differences, 'missingInNew', []).length,
                addedInNew: sc.get(differences, 'addedInNew', []).length,
                configDifferencesCount: sc.get(differences, 'configDifferences', []).length
            };
        }
        if(!report.pluginAnalysis){
            Logger.error('Plugin analysis is undefined in report');
            return summary;
        }
        for(let pluginName of Object.keys(report.pluginAnalysis)){
            let plugin = report.pluginAnalysis[pluginName];
            if(!plugin){
                Logger.error('Plugin '+pluginName+' is undefined in analysis');
                continue;
            }
            summary.totalPlugins++;
            if(plugin.hasEntities){
                summary.pluginsWithEntities++;
                if(!plugin.entities){
                    Logger.error('Plugin '+pluginName+' entities array is undefined');
                    continue;
                }
                summary.totalEntityFiles+= plugin.entities.length;
                if(!plugin.entitiesAnalysis){
                    Logger.error('Plugin '+pluginName+' entitiesAnalysis array is undefined');
                    continue;
                }
                for(let entityAnalysis of plugin.entitiesAnalysis){
                    if(!entityAnalysis){
                        Logger.error('Entity analysis is undefined in '+pluginName);
                        continue;
                    }
                    if(!entityAnalysis.generatedExists){
                        summary.entitiesMissingInGenerated++;
                    }
                }
            }
            if(plugin.hasModels){
                summary.pluginsWithModels++;
                if(!plugin.models){
                    Logger.error('Plugin '+pluginName+' models array is undefined');
                    continue;
                }
                summary.totalModelFiles+= plugin.models.length;
                if(!plugin.modelsAnalysis){
                    Logger.error('Plugin '+pluginName+' modelsAnalysis array is undefined');
                    continue;
                }
                for(let modelAnalysis of plugin.modelsAnalysis){
                    if(!modelAnalysis){
                        Logger.error('Model analysis is undefined in '+pluginName);
                        continue;
                    }
                    if(!modelAnalysis.generatedExists){
                        summary.modelsMissingInGenerated++;
                    }
                    if(!modelAnalysis.missingMethods){
                        Logger.error('Missing methods array is undefined for model in '+pluginName);
                        continue;
                    }
                    if(modelAnalysis.missingMethods.length > 0){
                        summary.modelsWithMissingMethods++;
                    }
                    if(!modelAnalysis.relationsDiff){
                        continue;
                    }
                    if(Array.isArray(modelAnalysis.relationsDiff)){
                        continue;
                    }
                    if('object' !== typeof modelAnalysis.relationsDiff){
                        continue;
                    }
                    if(!sc.hasOwn(modelAnalysis.relationsDiff, 'onlyInPlugin')){
                        continue;
                    }
                    if(!sc.hasOwn(modelAnalysis.relationsDiff, 'differentJoins')){
                        continue;
                    }
                    if(!modelAnalysis.relationsDiff.onlyInPlugin){
                        continue;
                    }
                    if(!modelAnalysis.relationsDiff.differentJoins){
                        continue;
                    }
                    if(modelAnalysis.relationsDiff.onlyInPlugin.length > 0 || modelAnalysis.relationsDiff.differentJoins.length > 0){
                        summary.modelsWithRelationDifferences++;
                    }
                }
            }
        }
        return summary;
    }
}

module.exports.GenerateCompleteComparison = GenerateCompleteComparison;

if(require.main === module){
    let generator = new GenerateCompleteComparison();
    generator.generate().then(() => {
        Logger.info('Analysis complete');
    }).catch((error) => {
        Logger.critical('Analysis failed: '+error.message);
        Logger.critical('Stack trace: '+error.stack);
        process.exit(1);
    });
}
