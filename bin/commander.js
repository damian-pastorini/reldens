#! /usr/bin/env node

/**
 *
 * Reldens - Commands
 *
 */

const dotenv = require('dotenv');
const { spawn } = require('child_process');
const { CreateAdmin } = require('../lib/users/server/create-admin');
const { ResetPassword } = require('../lib/users/server/reset-password');
const { ThemeManager } = require('../lib/game/server/theme-manager');
const { ServerManager } = require('../server');
const { FileHandler } = require('@reldens/server-utils');

class Commander
{

    projectRoot = process.cwd();
    reldensModulePath = FileHandler.joinPaths(this.projectRoot, 'node_modules', 'reldens');
    projectThemeName = 'default';
    jsSourceMaps = '1' === process.env.RELDENS_JS_SOURCEMAPS;
    cssSourceMaps = '1' === process.env.RELDENS_CSS_SOURCEMAPS;
    availableCommands = ['test', 'help', 'generateEntities', 'createAdmin', 'resetPassword'];
    command = '';
    ready = false;

    constructor()
    {
        console.info('- Reldens - ');
        console.info('- Use "help" as argument to see all the available commands:');
        console.info('$ node scripts/reldens-commands.js help');
        if(!FileHandler.exists(this.projectRoot)){
            console.error('- Can not access parent folder, check permissions.');
        }
        if(!FileHandler.exists(this.reldensModulePath)){
            console.error(
                '- Reldens node module folder not found, try `npm install`.',
                {
                    dirname: __dirname,
                    filename: __filename,
                    process: process.cwd(),
                    modulePath: this.reldensModulePath,
                    projectRoot: this.projectRoot
                }
            );
        }
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
        if(-1 !== this.availableCommands.indexOf(this.command)){
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
        let crudTestPath = FileHandler.joinPaths(this.projectRoot, 'crud-test');
        FileHandler.createFolder(crudTestPath);
        FileHandler.remove(crudTestPath);
        console.info('- Test OK.');
    }

    generateEntities()
    {
        this.loadEnvironmentConfig();
        let args = [
            'reldens-storage',
            'generateEntities',
            '--user='+process.env.RELDENS_DB_USER,
            '--pass='+process.env.RELDENS_DB_PASSWORD,
            '--host='+process.env.RELDENS_DB_HOST,
            '--database='+process.env.RELDENS_DB_NAME,
            '--driver='+(process.env.RELDENS_STORAGE_DRIVER || 'objection-js'),
            '--client='+process.env.RELDENS_DB_CLIENT
        ];
        let overrideArg = process.argv.find(arg => '--override' === arg);
        if(overrideArg){
            args.push('--override');
        }
        console.info('- Running: npx '+args.join(' '));
        let child = spawn('npx', args, {
            stdio: 'inherit',
            cwd: this.projectRoot,
            shell: true
        });
        child.on('exit', (code) => {
            process.exit(code || 0);
        });
    }

    async createAdmin()
    {
        console.info('- Creating admin user...');
        let args = this.getCommandArgs(['user', 'pass', 'email']);
        let serverManager = await this.initializeServerManager();
        let service = new CreateAdmin(serverManager);
        let result = await service.create(args.user, args.pass, args.email);
        process.exit(result ? 0 : 1);
    }

    async resetPassword()
    {
        console.info('- Resetting user password...');
        let args = this.getCommandArgs(['user', 'pass']);
        let serverManager = await this.initializeServerManager();
        let service = new ResetPassword(serverManager);
        let result = await service.reset(args.user, args.pass);
        process.exit(result ? 0 : 1);
    }

    getCommandArgs(requiredArgs)
    {
        let args = process.argv.slice(2);
        let parsedArgs = {};
        for(let arg of args){
            if(!arg.includes('=')){
                continue;
            }
            let [key, value] = arg.split('=');
            let cleanKey = key.replace('--', '');
            parsedArgs[cleanKey] = value;
        }
        for(let requiredArg of requiredArgs){
            if(!parsedArgs[requiredArg]){
                console.error('- Missing required argument: --'+requiredArg);
                process.exit(1);
            }
        }
        return parsedArgs;
    }

    loadEnvironmentConfig()
    {
        let envPath = FileHandler.joinPaths(this.projectRoot, '.env');
        if(!FileHandler.exists(envPath)){
            console.error('- .env file not found at: '+envPath);
            process.exit(1);
        }
        dotenv.config({path: envPath});
    }

    async initializeServerManager()
    {
        this.loadEnvironmentConfig();
        let serverManager = new ServerManager({
            projectRoot: this.projectRoot,
            projectThemeName: this.projectThemeName
        });
        await serverManager.initializeStorage(serverManager.rawConfig, serverManager.dataServerDriver);
        return serverManager;
    }

    help()
    {
        console.info(' - Available commands:'
            +"\n"+'createApp                        - Create base project, copy all default files like in the skeleton.'
            +"\n"+'resetDist                        - Delete and create the "dist" folder.'
            +"\n"+'removeDist                       - Delete the "dist" folder.'
            +"\n"+'installDefaultTheme              - Copy theme and packages from node_modules into the current project theme.'
            +"\n"+'copyAssetsToDist                 - Copy project theme assets into the "dist" folder.'
            +"\n"+'copyKnexFile                     - Copy the knexfile.js sample into the project.'
            +"\n"+'copyEnvFile                      - Copy the .env file sample into the project.'
            +"\n"+'copyIndex                        - Copy the index file sample into the project.'
            +"\n"+'copyDefaultAssets                - Copy the reldens module default assets into the "dist/assets" folder.'
            +"\n"+'copyDefaultTheme                 - Copy the reldens module default theme into the project theme.'
            +"\n"+'copyPackage                      - Copy the reldens module packages into the project.'
            +"\n"+'buildCss [theme-folder-name]     - Builds the project theme styles.'
            +"\n"+'buildClient [theme-folder-name]  - Builds the project theme index.html.'
            +"\n"+'buildSkeleton                    - Builds the styles and project theme index.html.'
            +"\n"+'copyNew                          - Copy all default files for the fullRebuild.'
            +"\n"+'fullRebuild                      - Rebuild the Skeleton from scratch.'
            +"\n"+'installSkeleton                  - Installs Skeleton.'
            +"\n"+'copyServerFiles                  - Reset the "dist" folder and runs a fullRebuild.'
            +"\n"+'generateEntities [--override]    - Generate entities from database using .env credentials.'
            +"\n"+'createAdmin --user=X --pass=Y --email=Z  - Create admin user with specified credentials.'
            +"\n"+'resetPassword --user=X --pass=Y  - Reset password for specified user.');
    }

}

module.exports = new Commander();
