#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    PlayersExperiencePerLevel,
    MonstersExperiencePerLevel,
    AttributesPerLevel
} = require('@reldens/game-data-generator');

let args = process.argv;
if(2 === args.length){
    console.error('- Missing arguments.', args);
    return false;
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
    }
};

function fetchFileContents(filePath)
{
    if (!filePath) {
        console.error('- Missing data file.', filePath);
        return false;
    }

    let relativePath = path.join(process.cwd(), filePath);
    if (!relativePath) {
        console.error('- Invalid data file path.', process.cwd(), filePath);
        return false;
    }

    let fileContent = fs.readFileSync(relativePath, {encoding: 'utf8', flag:'r'});
    if (!fileContent) {
        console.error('- Can not read data file or file empty.', relativePath);
        return false;
    }

    let importedJson = JSON.parse(fileContent);
    if (!importedJson) {
        console.error('- Can not parse data file.');
        return false;
    }

    return importedJson;
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

let importedJson = fetchFileContents(extractedParams[1] || '')

if ('monsters-experience-per-level' === command) {
    let importedPlayerLevelsJson = fetchFileContents(extractedParams[2] || '');
    if (!importedPlayerLevelsJson) {
        console.error('- Can not parse data file for player levels.');
        return false;
    }

    importedJson.levelsExperienceByKey = importedPlayerLevelsJson;
}

validCommands[command](importedJson);
