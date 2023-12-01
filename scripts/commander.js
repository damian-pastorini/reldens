/**
 *
 * Reldens - Commands
 *
 */

const fs = require('fs');
const path = require('path');

class Commander
{

    scriptPath = __dirname;
    projectRoot = path.join(this.scriptPath, '../');
    reldensModulePath = path.join(this.projectRoot, 'node_modules', 'reldens');
    projectThemeName = 'default';

    command = '';
    ready = false;

    constructor()
    {
        console.info('- Reldens - ');
        console.info('- Use "help" as argument to see all the available commands:');
        console.info('$ node scripts/reldens-commands.js help');
        try {
            fs.opendirSync(this.projectRoot);
        } catch (error) {
            console.error('- Can not access parent folder, check permissions.');
        }
        try {
            fs.opendirSync(this.reldensModulePath);
        } catch (error) {
            console.error('- Reldens node module folder not found, try `npm install`.');
        }
        const { ThemeManager } = require('reldens/lib/game/server/theme-manager');
        this.themeManager = new ThemeManager(this);
        let parseResult = this.parseArgs();
        if(!parseResult){
            return false;
        }
        this.ready = true;
        this.themeManager.setupPaths(this);
        console.info('- Command "'+this.command+'" ready to be executed.');
        console.info('- Theme: '+this.projectThemeName);
    }

    parseArgs()
    {
        let args = process.argv;
        if(2 === args.length){
            console.error('- Missing arguments.');
            return false;
        }
        let extractedParams = args.slice(2);
        this.command = extractedParams[0];
        if('test' === this.command || 'help' === this.command){
            return true;
        }
        if('execute' === this.command || 'function' !== typeof this.themeManager[this.command]){
            console.error('- Invalid command:', this.command);
            return false;
        }
        if(2 === extractedParams.length && '' !== extractedParams[1]){
            this.projectThemeName = extractedParams[1];
        }
        return true;
    }

    async execute()
    {
        await this.themeManager[this.command]();
        console.info('- Command executed!');
        process.exit();
    }

    test()
    {
        let crudTestPath = path.join(this.projectRoot, 'crud-test');
        fs.mkdirSync(crudTestPath, {recursive: true});
        fs.rmdirSync(crudTestPath);
        console.info('- Test OK.');
    }

    help()
    {
        console.info(' - Available commands:'
            +"\n"+'resetDist                        - Delete and create the "dist" folder.'
            +"\n"+'removeDist                       - Delete the "dist" folder.'
            +"\n"+'installDefaultTheme              - Copy theme and packages from node_modules into the current project theme.'
            +"\n"+'copyAssetsToDist                 - Copy project theme assets into the "dist" folder.'
            +"\n"+'copyKnexFile                     - Copy the knexfile.js sample into the project.'
            +"\n"+'copyEnvFile                      - Copy the .env file sample into the project.'
            +"\n"+'copyIndex                        - Copy the index file sample into the project.'
            +"\n"+'copyDefaultAssets                - Copy the reldens module default assets into the "dist/assets" folder.'
            +"\n"+'copyDefaultTheme                 - Copy the reldens module default theme into the project theme.'
            +"\n"+'copyCustomAssets                 - Copy the project assets into the "dist/assets" folder.'
            +"\n"+'copyPackage                      - Copy the reldens module packages into the project.'
            +"\n"+'buildCss [theme-folder-name]     - Builds the project theme styles.'
            +"\n"+'buildClient [theme-folder-name]  - Builds the project theme index.html.'
            +"\n"+'buildSkeleton                    - Builds the styles and project theme index.html.'
            +"\n"+'copyNew                          - Copy all default files for the fullRebuild.'
            +"\n"+'fullRebuild                      - Rebuild the Skeleton from scratch.'
            +"\n"+'installSkeleton                  - Installs Skeleton.'
            +"\n"+'copyServerFiles                  - Reset the "dist" folder and runs a fullRebuild.');
    }

}

module.exports = new Commander();
