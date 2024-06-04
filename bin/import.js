#! /usr/bin/env node

const { ServerManager } = require('../server');
const { PlayersExperiencePerLevelImporter } = require('../lib/import/server/players-experience-per-level-importer');
const { AttributesPerLevelImporter } = require('../lib/import/server/attributes-per-level-importer');
const { ClassPathsImporter } = require('../lib/import/server/class-paths-importer');
const { MapsImporter } = require('../lib/import/server/maps-importer');
const { SkillsImporter } = require('../lib/import/server/skills-importer');
const { FileHandler } = require('../lib/game/server/file-handler');

/**
 *
 * Commands:
 *
 * - Players experience per level import is not required if class-paths importer is going to be used.
 * $ npx reldens-import players-experience-per-level custom-game-theme-test generate-data/players-experience-per-level.json
 *
 * - Class-paths importer will also import the experience per level.
 * $ npx reldens-import class-paths custom-game-theme-test generate-data/class-paths.json
 *
 * $ npx reldens-import attributes-per-level custom-game-theme-test generate-data/class-paths-attributes-per-level.json
 *
 * $ npx reldens-import maps custom-game-theme-test generate-data/maps.json
 *
 * $ npx reldens-import skills custom-game-theme-test generate-data/skills-data.json
 *
 */

let validCommands = {
    'players-experience-per-level': async (data, projectThemeName) => {
        let serverManager = await initializeServer(data, projectThemeName);
        if (!serverManager) {
            return false;
        }
        let importer = new PlayersExperiencePerLevelImporter(serverManager);
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
    'maps': async (data, projectThemeName) => {
        let serverManager = await initializeServer(data, projectThemeName);
        if (!serverManager) {
            return false;
        }
        let importer = new MapsImporter(serverManager);
        await importer.import(data);
    },
    'skills': async (data, projectThemeName) => {
        let serverManager = await initializeServer(data, projectThemeName);
        if (!serverManager) {
            return false;
        }
        let importer = new SkillsImporter(serverManager);
        await importer.import(data);
    }
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
    await appServer.initializeStorage(appServer.rawConfig, appServer.dataServerDriver);
    return appServer;
}

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

let themeName = extractedParams[1] || '';
if (!themeName) {
    console.error('- Missing active theme name.');
    return false;
}

if (-1 === Object.keys(validCommands).indexOf(command)) {
    console.error('- Invalid command.', command);
    return false;
}

validCommands[command](FileHandler.fetchFileJson(extractedParams[2] || ''), themeName).then(() => {
    console.log('Done.');
    process.exit();
}).catch((error) => {
    console.error(error);
    process.exit();
});
