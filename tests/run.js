/**
 *
 * Reldens - Admin Integration Test Runner
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

Logger.activeLogLevels = [100];
Logger.setLogLevel(100);
Logger.addTimeStamp = false;
Logger.context().RELDENS_ENABLE_TRACE_FOR = 'none';

async function runTests()
{
    try {
        Logger.log(100, '', '='.repeat(60));
        Logger.log(100, '', 'TESTING RELDENS ADMIN INTEGRATION');
        Logger.log(100, '', '='.repeat(60)+'\n');
        Logger.log(100, '', 'Test execution started: '+sc.formatDate(new Date()));
        let config = JSON.parse(process.argv[2] || '{}');
        let testFiles = await getTestFilesFromDirectory(__dirname);
        let filter = null;
        let methodFilter = null;
        let breakOnError = false;
        for(let arg of process.argv){
            if(arg.startsWith('--filter=')){
                let filterValue = arg.split('=')[1];
                if(filterValue.includes('::')){
                    let filterParts = filterValue.split('::');
                    filter = filterParts[0];
                    methodFilter = filterParts[1];
                }
                if(!filterValue.includes('::')){
                    filter = filterValue;
                }
            }
            if(arg === '--break-on-error'){
                breakOnError = true;
            }
        }
        testFiles = applyFilter(testFiles, filter);
        if(0 === testFiles.length){
            let filterMsg = filter ? ' matching filter: '+filter : '';
            Logger.log(100, '', 'No test files found in directory: '+__dirname+filterMsg);
            process.exit(1);
        }
        let totalTests = 0;
        let totalPassed = 0;
        for(let testFile of testFiles){
            let testDisplayName = getTestDisplayName(testFile);
            Logger.log(100, '', 'Running '+testDisplayName+' ('+testFile+')');
            let testModule = require(FileHandler.joinPaths(__dirname, testFile));
            let TestClassName = Object.keys(testModule)[0];
            if(!TestClassName){
                Logger.log(100, '', 'No test class found in: '+testFile);
                continue;
            }
            let TestClass = testModule[TestClassName];
            let testInstance = new TestClass(config);
            testInstance.breakOnError = breakOnError;
            let testMethods = getTestMethods(testInstance);
            if(methodFilter){
                testMethods = testMethods.filter(methodName => methodName.includes(methodFilter));
            }
            if(0 === testMethods.length){
                let methodFilterMsg = methodFilter ? ' matching method filter: '+methodFilter : '';
                Logger.log(100, '', 'No test methods found in: '+testFile+methodFilterMsg);
                continue;
            }
            for(let methodName of testMethods){
                if('function' === typeof testInstance[methodName]){
                    let testFailed = false;
                    try {
                        await testInstance[methodName]();
                    } catch(error){
                        testFailed = true;
                        Logger.log(100, '', 'Test method failed: '+methodName+' - '+error.message);
                        if(breakOnError){
                            Logger.log(100, '', 'Breaking on error as requested');
                            process.exit(1);
                        }
                    }
                    if(breakOnError && testFailed){
                        break;
                    }
                }
            }
            totalTests += testInstance.testCount;
            totalPassed += testInstance.passedCount;
            if(breakOnError && testInstance.testCount !== testInstance.passedCount){
                Logger.log(100, '', 'Breaking execution due to test failure');
                break;
            }
        }
        Logger.log(100, '', '='.repeat(60));
        if(totalTests === totalPassed){
            Logger.log(100, '', 'ALL TESTS PASSED: '+totalPassed+'/'+totalTests+' succeed.');
            Logger.log(100, '', '='.repeat(60));
            process.exit(0);
        }
        Logger.log(100, '', 'TESTS FAILED: '+totalPassed+'/'+totalTests+' succeed.');
        Logger.log(100, '', '='.repeat(60));
        process.exit(1);
    } catch(error){
        Logger.log(100, '', 'Test execution failed: '+error.message);
        Logger.log(100, '', error.stack);
        process.exit(1);
    }
}

function getTestMethods(testInstance)
{
    let methods = [];
    for(let prototype = Object.getPrototypeOf(testInstance);
        prototype !== null && prototype.constructor.name !== 'BaseTest';
        prototype = Object.getPrototypeOf(prototype)){
        let propertyNames = Object.getOwnPropertyNames(prototype);
        for(let propertyName of propertyNames){
            if(
                propertyName.startsWith('test')
                && sc.isFunction(testInstance[propertyName])
                && 'constructor' !== propertyName
            ){
                if(!methods.includes(propertyName)){
                    methods.push(propertyName);
                }
            }
        }
    }
    return methods.sort();
}

function getTestDisplayName(fileName)
{
    return fileName
            .replace(/^test-/, '')
            .replace(/\.js$/, '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        + ' Tests';
}

function applyFilter(testFiles, filter)
{
    if(!filter){
        return testFiles;
    }
    return testFiles.filter(file => file.includes(filter));
}

async function getTestFilesFromDirectory(directoryPath)
{
    if(!FileHandler.exists(directoryPath)){
        return [];
    }
    let files = FileHandler.readFolder(directoryPath);
    let excludeFiles = ['manager.js', 'utils.js', 'run.js', 'base-test.js'];
    return files.filter(file => file.startsWith('test-') && file.endsWith('.js') && !excludeFiles.includes(file));
}

process.on('unhandledRejection', (reason, promise) => {
    Logger.log(100, '', 'Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    Logger.log(100, '', 'Uncaught Exception:', error);
    process.exit(1);
});

runTests();
