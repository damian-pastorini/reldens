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
        if(0 === testFiles.length){
            Logger.log(100, '', 'No test files found in directory: '+__dirname);
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
            await testInstance.runAllTests();
            totalTests += testInstance.testCount;
            totalPassed += testInstance.passedCount;
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
