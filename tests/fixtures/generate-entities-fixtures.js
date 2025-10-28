/**
 *
 * Reldens - GenerateEntitiesFixtures
 *
 */

const { EntitiesLoader } = require('../../lib/game/server/entities-loader');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class GenerateEntitiesFixtures
{
    async generate(outputFileName)
    {
        let reldensModuleLibPath = FileHandler.joinPaths(__dirname, '..', '..', 'lib');
        let projectRoot = FileHandler.joinPaths(__dirname, '..', '..', '..');
        let bucketFullPath = FileHandler.joinPaths(projectRoot, 'theme', 'default');
        let distPath = FileHandler.joinPaths(projectRoot, 'dist');
        let storageDriver = process.env.RELDENS_STORAGE_DRIVER || 'objection-js';
        let result = EntitiesLoader.loadEntities({
            reldensModuleLibPath: reldensModuleLibPath,
            bucketFullPath: bucketFullPath,
            distPath: distPath,
            storageDriver: storageDriver,
            withConfig: true,
            withTranslations: true
        });
        if(!result){
            Logger.critical('Failed to load entities.');
            process.exit(1);
        }
        let entityStructures = {};
        for(let key of Object.keys(result.entitiesRaw)){
            entityStructures[key] = this.introspectClass(result.entitiesRaw[key]);
        }
        let snapshot = {
            timestamp: new Date().toISOString(),
            storageDriver: storageDriver,
            stats: {
                entitiesCount: Object.keys(result.entities).length,
                entitiesRawCount: Object.keys(result.entitiesRaw).length,
                translationsCount: Object.keys(result.translations).length
            },
            entityKeys: Object.keys(result.entities).sort(),
            entities: result.entities,
            entitiesRaw: result.entitiesRaw,
            translations: result.translations,
            classStructures: entityStructures
        };
        let outputPath = FileHandler.joinPaths(__dirname, outputFileName);
        FileHandler.writeFile(outputPath, JSON.stringify(snapshot, null, 2));
        Logger.info('Fixture generated: '+outputPath);
        Logger.info('Entities: '+snapshot.stats.entitiesCount);
        Logger.info('Raw: '+snapshot.stats.entitiesRawCount);
        Logger.info('Translations: '+snapshot.stats.translationsCount);
        return snapshot;
    }

    introspectClass(classConstructor)
    {
        if(!classConstructor){
            return null;
        }
        let structure = {
            className: classConstructor.name,
            instanceMethods: [],
            staticMethods: [],
            properties: []
        };
        let prototype = classConstructor.prototype;
        if(prototype){
            let protoProps = Object.getOwnPropertyNames(prototype);
            for(let prop of protoProps){
                if('constructor' === prop){
                    continue;
                }
                if('function' === typeof prototype[prop]){
                    structure.instanceMethods.push(prop);
                }
            }
        }
        let staticProps = Object.getOwnPropertyNames(classConstructor);
        for(let prop of staticProps){
            if('length' === prop || 'name' === prop || 'prototype' === prop){
                continue;
            }
            if('function' === typeof classConstructor[prop]){
                structure.staticMethods.push(prop);
                continue;
            }
            structure.properties.push(prop);
        }
        structure.instanceMethods.sort();
        structure.staticMethods.sort();
        structure.properties.sort();
        return structure;
    }
}

module.exports.GenerateEntitiesFixtures = GenerateEntitiesFixtures;

if(require.main === module){
    let generator = new GenerateEntitiesFixtures();
    let fileName = process.argv[2] || 'generated-entities-old.json';
    generator.generate(fileName);
}
