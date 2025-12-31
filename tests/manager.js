/**
 *
 * Reldens - Manager
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');
const { spawn } = require('child_process');
const readline = require('readline');

class Manager
{

    constructor()
    {
        this.projectRoot = process.cwd();
        this.testsDir = FileHandler.joinPaths(this.projectRoot, 'tests');
        this.configFile = FileHandler.joinPaths(this.testsDir, 'config.json');
        this.config = {};
        this.parseArguments();
    }

    parseArguments()
    {
        for(let arg of process.argv){
            if(arg.startsWith('--filter=')){
                this.filter = arg.split('=')[1];
                Logger.log(100, '', 'Filter applied: '+this.filter);
            }
            if(arg === '--break-on-error'){
                this.breakOnError = true;
                Logger.log(100, '', 'Break on error enabled');
            }
        }
    }

    async run()
    {
        Logger.log(100, '', '='.repeat(60));
        Logger.log(100, '', 'RELDENS TEST MANAGER');
        Logger.log(100, '', '='.repeat(60));
        let config = await this.loadOrCreateConfig();
        await this.executeTests(config);
    }

    async loadOrCreateConfig()
    {
        if(FileHandler.exists(this.configFile)){
            Logger.log(100, '', 'Loading existing test configuration...');
            let configContent = FileHandler.readFile(this.configFile);
            this.config = JSON.parse(configContent);
            return this.config;
        }
        Logger.log(100, '', 'Test configuration not found, creating new...');
        await this.promptConfig();
        this.saveConfig();
        return this.config;
    }

    async promptConfig()
    {
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
        Logger.log(100, '', 'Test configuration setup:');
        this.config.baseUrl = await question('Server URL (http://localhost:8080): ') || 'http://localhost:8080';
        this.config.adminPath = await question('Admin path (/reldens-admin): ') || '/reldens-admin';
        this.config.adminUser = await question('Admin username (root@yourgame.com): ') || 'root@yourgame.com';
        this.config.adminPassword = await question('Admin password (root): ') || 'root';
        this.config.serverPath = await question('Server folder path (optional, for upload tests): ') || '';
        this.config.themeName = await question('Theme name (default): ') || 'default';
        this.config.dbHost = await question('Database host (localhost): ') || 'localhost';
        this.config.dbPort = await question('Database port (3306): ') || '3306';
        this.config.dbUser = await question('Database user (reldens): ') || 'reldens';
        this.config.dbPassword = await question('Database password (reldens): ') || 'reldens';
        this.config.dbName = await question('Database name (reldens_test): ') || 'reldens_test';
        rl.close();
    }

    saveConfig()
    {
        let configContent = JSON.stringify(this.config, null, 2);
        FileHandler.writeFile(this.configFile, configContent);
        Logger.log(100, '', 'Test configuration saved to: '+this.configFile);
    }

    async executeTests(config)
    {
        Logger.log(100, '', 'Starting tests against: '+config.baseUrl+config.adminPath);
        if(config.serverPath){
            Logger.log(100, '', 'Upload tests enabled with server path: '+config.serverPath);
        }
        let configArg = JSON.stringify(config);
        let args = [FileHandler.joinPaths(this.testsDir, 'run.js'), configArg];
        if(this.filter){
            args.push('--filter='+this.filter);
        }
        if(this.breakOnError){
            args.push('--break-on-error');
        }
        let testRunner = spawn('node', args, {
            stdio: 'inherit'
        });
        return new Promise((resolve) => {
            testRunner.on('close', (code) => {
                Logger.log(100, '', 'Test execution completed with exit code: '+code);
                process.exit(code);
            });
        });
    }

}

let manager = new Manager();
manager.run().catch((error) => {
    Logger.critical('Manager error: '+error.message);
    process.exit(1);
});
