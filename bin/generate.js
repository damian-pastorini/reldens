#! /usr/bin/env node

const {
    PlayersExperiencePerLevel,
    MonstersExperiencePerLevel,
    AttributesPerLevel
} = require('@reldens/game-data-generator');
const {
    RandomMapGenerator,
    LayerElementsObjectLoader,
    LayerElementsCompositeLoader,
    MultipleByLoaderGenerator,
    MultipleWithAssociationsByLoaderGenerator
} = require('@reldens/tile-map-generator');
const { FileHandler } = require('../lib/game/server/file-handler');
const { Logger } = require('@reldens/utils');

/**
 *
 * Commands:
 *
 * $ npx reldens-generate players-experience-per-level ./generate-data/players-experience-per-level.json
 *
 * $ npx reldens-generate monsters-experience-per-level ./generate-data/monsters-experience-per-level.json ./generate-data/players-level-sample.json
 *
 * $ npx reldens-generate attributes-per-level ./generate-data/attributes-per-level.json
 *
 * $ npx reldens-generate maps ./generate-data/map-data.json LayerElementsObjectLoader
 *
 * $ npx reldens-generate maps ./generate-data/map-composite-data.json LayerElementsCompositeLoader
 *
 * $ npx reldens-generate maps ./generate-data/map-composite-data-with-names.json MultipleByLoaderGenerator
 *
 * $ RELDENS_LOG_LEVEL=9 npx reldens-generate maps ./generate-data/map-composite-data-with-associations.json MultipleWithAssociationsByLoaderGenerator
 *
 */

let mapsGenerateModes = {
    LayerElementsObjectLoader: async (commandParams) => {
        let loader = new LayerElementsObjectLoader(commandParams);
        await loader.load();
        let generator = new RandomMapGenerator(loader.mapData);
        return await generator.generate();
    },
    LayerElementsCompositeLoader: async (commandParams) => {
        let loader = new LayerElementsCompositeLoader(commandParams);
        await loader.load();
        let generator = new RandomMapGenerator();
        await generator.fromElementsProvider(loader.mapData);
        return await generator.generate();
    },
    MultipleByLoaderGenerator: async (commandParams) => {
        let generator = new MultipleByLoaderGenerator({loaderData: commandParams});
        await generator.generate();
    },
    MultipleWithAssociationsByLoaderGenerator: async (commandParams) => {
        let generator = new MultipleWithAssociationsByLoaderGenerator({loaderData: commandParams});
        await generator.generate();
    }
};

let validCommands = {
    'players-experience-per-level': (commandParams) => {
        let playersExperiencePerLevel = new PlayersExperiencePerLevel(commandParams);
        playersExperiencePerLevel.generate();
    },
    'monsters-experience-per-level': (commandParams) => {
        let monstersExperiencePerLevel = new MonstersExperiencePerLevel(commandParams);
        monstersExperiencePerLevel.generate();
    },
    'attributes-per-level': (commandParams) => {
        let attributesPerLevel = new AttributesPerLevel(commandParams);
        attributesPerLevel.generate();
    },
    'maps': async (commandParams) => {
        if(!mapsGenerateModes[commandParams.importMode]){
            console.error('- Invalid import mode. Valid options: '+Object.keys(mapsGenerateModes).join(', '));
        }
        let pathParts = commandParams.mapDataFile.split('/');
        commandParams.mapDataFile = pathParts.pop();
        commandParams.rootFolder = FileHandler.joinPaths(process.cwd(), ...pathParts);
        // @TODO - BETA - Fix the generated folder placement.
        // this will generate everything under rootFolder/whatever-the-path-is/generated:
        await mapsGenerateModes[commandParams.importMode](commandParams);
        let generatedFolder = FileHandler.joinPaths(commandParams.rootFolder, 'generated');
        // we need to move the generated data to rootFolder/generated:
        FileHandler.copyFolderSync(
            generatedFolder,
            FileHandler.joinPaths(process.cwd(), 'generated')
        );
    }
};

let args = process.argv;
if(2 === args.length){
    console.error('- Missing arguments.', args);
    return false;
}

let extractedParams = args.slice(2);

let command = extractedParams[0] || false;
if(!command){
    console.error('- Missing command.');
    return false;
}

if(-1 === Object.keys(validCommands).indexOf(command)){
    console.error('- Invalid command.', command);
    return false;
}

let importJson = 'monsters-experience-per-level' === command
    || 'players-experience-per-level' === command
    || 'attributes-per-level' === command;

if(importJson){
    let filePath = FileHandler.joinPaths(process.cwd(), extractedParams[1] || '');
    if(!filePath){
        Logger.error('Invalid data file path.', process.cwd(), filePath);
        return false;
    }
    let importedJson = FileHandler.fetchFileJson(filePath);
    if(!importedJson){
        console.error('- Can not parse data file.');
        return false;
    }
    if('monsters-experience-per-level' === command){
        let secondaryFilePath = FileHandler.joinPaths(process.cwd(), extractedParams[2] || '');
        if(!secondaryFilePath){
            Logger.error('Invalid data file path.', process.cwd(), secondaryFilePath);
            return false;
        }
        let importedPlayerLevelsJson = FileHandler.fetchFileJson(secondaryFilePath);
        if(!importedPlayerLevelsJson){
            console.error('- Can not parse data file for player levels.');
            return false;
        }

        importedJson.levelsExperienceByKey = importedPlayerLevelsJson;
    }
    return validCommands[command](importedJson);
}


if('maps' === command){
    return validCommands[command]({
        mapDataFile: extractedParams[1],
        importMode: extractedParams[2] || ''
    });
}
