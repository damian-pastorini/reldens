/**
 *
 * Reldens - Default Self-Hosted Admin Test Runner
 *
 * Boots an independent in-process server (like the e2e suite) and runs the existing admin
 * integration test classes against it, instead of connecting to an external running project.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { DatabaseResetUtility } = require('../database-reset-utility');
const { ServerLauncher } = require('./server-launcher');
const readline = require('readline/promises');

class RunDefault
{

    constructor()
    {
        this.testsDir = FileHandler.joinPaths(process.cwd(), 'tests');
        this.configFile = FileHandler.joinPaths(this.testsDir, 'config.json');
        this.launcher = new ServerLauncher();
        this.config = {};
        this.filter = null;
        this.methodFilter = null;
        this.breakOnError = false;
    }

    parseArguments()
    {
        for(let arg of process.argv){
            if(arg.startsWith('--filter=')){
                let filterValue = arg.split('=')[1];
                if(filterValue.includes('::')){
                    this.filter = filterValue.split('::')[0];
                    this.methodFilter = filterValue.split('::')[1];
                }
                if(!filterValue.includes('::')){
                    this.filter = filterValue;
                }
            }
            if('--break-on-error' === arg){
                this.breakOnError = true;
            }
        }
    }

    async run()
    {
        Logger.activeLogLevels = [100];
        Logger.setLogLevel(100);
        Logger.addTimeStamp = false;
        Logger.context().RELDENS_ENABLE_TRACE_FOR = 'none';
        this.setupLogCapture();
        try {
            await this.execute();
        } catch(error) {
            Logger.log(100, '', 'Test execution failed: '+error.message);
            Logger.log(100, '', error.stack);
            await this.shutdown(1);
        }
    }

    setupLogCapture()
    {
        let logPath = FileHandler.joinPaths(process.cwd(), 'test-results', 'server.log');
        FileHandler.createFolder(FileHandler.joinPaths(process.cwd(), 'test-results'));
        FileHandler.writeFile(logPath, '');
        Logger.callback = (...args) => process.stdout.write(this.formatLogArgs(args)+'\n');
        console.log = (...args) => FileHandler.appendToFile(logPath, this.formatLogArgs(args)+'\n');
        console.error = (...args) => FileHandler.appendToFile(logPath, this.formatLogArgs(args)+'\n');
    }

    formatLogArgs(args)
    {
        let parts = [];
        for(let arg of args){
            parts.push('object' === typeof arg ? sc.toJsonString(arg) : ''+arg);
        }
        return parts.join(' ');
    }

    async execute()
    {
        this.parseArguments();
        this.config = this.loadConfig();
        if(!this.config){
            Logger.log(100, '', 'Configuration not found: '+this.configFile);
            process.exit(1);
        }
        if(!await this.confirmExecution()){
            Logger.log(100, '', 'Tests cancelled by user.');
            process.exit(0);
        }
        Logger.log(100, '', '='.repeat(60));
        Logger.log(100, '', 'TESTING RELDENS ADMIN INTEGRATION (SELF-HOSTED)');
        Logger.log(100, '', '='.repeat(60)+'\n');
        Logger.log(100, '', 'Test execution started: '+sc.formatDate(new Date()));
        Logger.log(100, '', 'Resetting database before tests...');
        if(!await new DatabaseResetUtility(this.config).resetDatabase()){
            Logger.log(100, '', 'Database reset failed - aborting test execution');
            await this.shutdown(1);
        }
        await this.startServer();
        await this.shutdown(this.reportExitCode(await this.runTestFiles()));
    }

    loadConfig()
    {
        let content = FileHandler.readFile(this.configFile);
        if(!content){
            return false;
        }
        return sc.parseJson(content, false);
    }

    async confirmExecution()
    {
        let rl = readline.createInterface({input: process.stdin, output: process.stdout});
        Logger.log(100, '', 'WARNING: the self-hosted tests will reset the database: '+this.config.dbName);
        let answer = await rl.question('Do you want to continue? (y/N): ');
        rl.close();
        return 'y' === answer.toLowerCase() || 'yes' === answer.toLowerCase();
    }

    async startServer()
    {
        Logger.log(100, '', 'Starting self-hosted server (this may take a moment)...');
        let baseUrl = await this.launcher.start(this.config);
        if(!baseUrl){
            Logger.log(100, '', 'Self-hosted server failed to start - aborting test execution');
            await this.shutdown(1);
        }
        this.config.baseUrl = baseUrl;
        Logger.log(100, '', 'Self-hosted server ready at: '+baseUrl+'\n');
    }

    async runTestFiles()
    {
        let testFiles = this.getTestFiles();
        if(0 === testFiles.length){
            Logger.log(100, '', 'No admin test files found in: '+this.testsDir);
            return {totalTests: 0, totalPassed: 0};
        }
        let totalTests = 0;
        let totalPassed = 0;
        for(let testFile of testFiles){
            let counts = await this.runTestFile(testFile);
            totalTests += counts.testCount;
            totalPassed += counts.passedCount;
            if(this.breakOnError && counts.testCount !== counts.passedCount){
                Logger.log(100, '', 'Breaking execution due to test failure');
                break;
            }
        }
        return {totalTests, totalPassed};
    }

    createTestInstance(testFile)
    {
        let displayName = testFile.replace(/^test-/, '').replace(/\.js$/, '').split('-')
            .map(word => word.charAt(0).toUpperCase()+word.slice(1))
            .join(' ')+' Tests';
        Logger.log(100, '', 'Running '+displayName+' ('+testFile+')');
        let testModule = require(FileHandler.joinPaths(this.testsDir, testFile));
        let testClassName = [...Object.keys(testModule)].shift();
        if(!testClassName){
            Logger.log(100, '', 'No test class found in: '+testFile);
            return false;
        }
        let testInstance = new testModule[testClassName](this.config);
        testInstance.breakOnError = this.breakOnError;
        return testInstance;
    }

    async runTestFile(testFile)
    {
        let testInstance = this.createTestInstance(testFile);
        if(!testInstance){
            return {testCount: 0, passedCount: 0};
        }
        let methods = this.getTestMethods(testInstance);
        if(this.methodFilter){
            methods = methods.filter(name => name.includes(this.methodFilter));
        }
        for(let methodName of methods){
            if(!sc.isFunction(testInstance[methodName])){
                continue;
            }
            try {
                await testInstance[methodName]();
            } catch(error) {
                Logger.log(100, '', 'Test method failed: '+methodName+' - '+error.message);
                if(this.breakOnError){
                    Logger.log(100, '', 'Breaking on error as requested');
                    await this.shutdown(1);
                }
            }
        }
        return {testCount: testInstance.testCount, passedCount: testInstance.passedCount};
    }

    getTestMethods(testInstance)
    {
        let methods = [];
        for(let prototype = Object.getPrototypeOf(testInstance);
            null !== prototype && 'BaseTest' !== prototype.constructor.name;
            prototype = Object.getPrototypeOf(prototype)){
            this.collectPrototypeTestMethods(prototype, testInstance, methods);
        }
        return methods.sort();
    }

    collectPrototypeTestMethods(prototype, testInstance, methods)
    {
        for(let propertyName of Object.getOwnPropertyNames(prototype)){
            if(!propertyName.startsWith('test')){
                continue;
            }
            if(!sc.isFunction(testInstance[propertyName])){
                continue;
            }
            if(!methods.includes(propertyName)){
                methods.push(propertyName);
            }
        }
    }

    getTestFiles()
    {
        let files = FileHandler.readFolder(this.testsDir);
        if(!files){
            return [];
        }
        let testFiles = files.filter(file => {
            return file.startsWith('test-')
                && file.endsWith('.js')
                && !['manager.js', 'utils.js', 'run.js', 'base-test.js'].includes(file);
        });
        if(this.filter){
            return testFiles.filter(file => file.includes(this.filter));
        }
        return testFiles;
    }

    reportExitCode(summary)
    {
        Logger.log(100, '', '='.repeat(60));
        if(summary.totalTests === summary.totalPassed){
            Logger.log(100, '', 'ALL TESTS PASSED: '+summary.totalPassed+'/'+summary.totalTests+' succeed.');
            Logger.log(100, '', '='.repeat(60));
            return 0;
        }
        Logger.log(100, '', 'TESTS FAILED: '+summary.totalPassed+'/'+summary.totalTests+' succeed.');
        Logger.log(100, '', '='.repeat(60));
        return 1;
    }

    async shutdown(exitCode)
    {
        await this.launcher.stop();
        process.exit(exitCode);
    }

}

module.exports.RunDefault = RunDefault;

process.on('unhandledRejection', (reason) => {
    Logger.log(100, '', 'Unhandled Rejection reason: '+reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    Logger.log(100, '', 'Uncaught Exception: '+error.message+'\n'+error.stack);
    process.exit(1);
});

new RunDefault().run();
