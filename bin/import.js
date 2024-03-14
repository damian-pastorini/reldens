#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const { ServerManager } = require('../server');
const { PlayersExperiencePerLevelImporter } = require('../lib/import/server/players-experience-per-level-importer');
const { MonstersExperiencePerLevelImporter } = require('../lib/import/server/monsters-experience-per-level-importer');
const { AttributesPerLevelImporter } = require('../lib/import/server/attributes-per-level-importer');
const { ClassPathsImporter } = require('../lib/import/server/class-paths-importer');

let args = process.argv;
if(2 === args.length){
    console.error('- Missing arguments.', args);
    return false;
}

let validCommands = {
    'players-experience-per-level': async (data, projectThemeName) => {
        let serverManager = await initializeServer(data, projectThemeName);
        if (!serverManager) {
            return false;
        }
        let importer = new PlayersExperiencePerLevelImporter(serverManager);
        await importer.import(data);
    },
    'monsters-experience-per-level': async (data, projectThemeName) => {
        let serverManager = await initializeServer(data, projectThemeName);
        if (!serverManager) {
            return false;
        }
        let importer = new MonstersExperiencePerLevelImporter(serverManager);
        await importer.import(data);
    },
    'attributes-per-level': async (data, projectThemeName) => {
        let serverManager = await initializeServer(data, projectThemeName);
        if (!serverManager) {
            return false;
        }
        let importer = new AttributesPerLevelImporter(serverManager);
        await importer.import(data);
    },
    'class-paths': async (data, projectThemeName) => {
        let serverManager = await initializeServer(data, projectThemeName);
        if (!serverManager) {
            return false;
        }
        let importer = new ClassPathsImporter(serverManager);
        await importer.import(data);
    },
};

async function initializeServer(data, projectThemeName)
{
    if (!data) {
        console.error('- Missing data.', data);
        return false;
    }
    let appServer = new ServerManager({
        projectRoot: process.cwd(),
        projectThemeName
    });
    if (!appServer) {
        console.error('- Can not initialize server.', projectThemeName);
        return false;
    }
    await appServer.initializeStorage(appServer.rawConfig, appServer.dataServerDriver);
    return appServer;
}

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

let themeName = extractedParams[1] || '';
if (!themeName) {
    console.error('- Missing active theme name.');
    return false;
}

if (-1 === Object.keys(validCommands).indexOf(command)) {
    console.error('- Invalid command.', command);
    return false;
}

validCommands[command](fetchFileContents(extractedParams[2] || ''), themeName).then(() => {
    console.log('Done.');
    process.exit();
}).catch((error) => {
    console.error(error);
    process.exit();
});
