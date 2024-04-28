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
} = require("@reldens/tile-map-generator");
const { fetchFileContents } = require('./fetch-file-contents');

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
 * $ npx reldens-generate maps ./generate-data/map-composite-data-with-associations.json MultipleWithAssociationsByLoaderGenerator
 *
 */

let mapsGenerateModes = {
    LayerElementsObjectLoader: async (commandParams) => {
        const loader = new LayerElementsObjectLoader(commandParams);
        await loader.load();
        const generator = new RandomMapGenerator(loader.mapData);
        return await generator.generate();
    },
    LayerElementsCompositeLoader: async (commandParams) => {
        const loader = new LayerElementsCompositeLoader(commandParams);
        await loader.load();
        const generator = new RandomMapGenerator();
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
}

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
        if (!mapsGenerateModes[commandParams.importMode]) {
            console.error('- Invalid import mode. Valid options: '+Object.keys(mapsGenerateModes).join(', '));
        }
        mapsGenerateModes[commandParams.importMode](commandParams);
    }
};

let args = process.argv;
if(2 === args.length){
    console.error('- Missing arguments.', args);
    return false;
}

let extractedParams = args.slice(2);

let command = extractedParams[0] || false;
if (!command) {
    console.error('- Missing command.');
    return false;
}

if (-1 === Object.keys(validCommands).indexOf(command)) {
    console.error('- Invalid command.', command);
    return false;
}

let importJson = 'monsters-experience-per-level' === command
    || 'players-experience-per-level' === command
    || 'attributes-per-level' === command;

if (importJson) {
    let importedJson = fetchFileContents(extractedParams[1] || '');
    if ('monsters-experience-per-level' === command) {
        let importedPlayerLevelsJson = fetchFileContents(extractedParams[2] || '');
        if (!importedPlayerLevelsJson) {
            console.error('- Can not parse data file for player levels.');
            return false;
        }

        importedJson.levelsExperienceByKey = importedPlayerLevelsJson;
    }
    return validCommands[command](importedJson);
}


if ('maps' === command) {
    return validCommands[command]({
        rootFolder: process.cwd()+'/generate-data/',
        mapDataFile: extractedParams[1],
        // mapData: fetchFileContents(extractedParams[1] || ''),
        importMode: extractedParams[2] || ''
    });
}
