/**
 *
 * Reldens - E2E Console File Redirect
 *
 * Redirects console.log and console.error of an e2e process to a file in test-results (the e2e server booted by the
 * global setup to server.log, its Logger prints with console.log, and the Playwright workers to tests.log). The logged
 * objects are inspected with a limited depth, so an object with circular references (a room or a player schema) never
 * throws from the log call and never breaks the server flow that logged it.
 *
 */

const util = require('util');
const { FileHandler } = require('@reldens/server-utils');

class E2eConsoleFileRedirect
{

    static INSPECT_OPTIONS = {depth: 2, breakLength: Number.MAX_SAFE_INTEGER};

    static formatArgs(args)
    {
        return args.map(
            arg => 'object' === typeof arg ? util.inspect(arg, E2eConsoleFileRedirect.INSPECT_OPTIONS) : ''+arg
        ).join(' ');
    }

    static redirect(fileName, clearFile)
    {
        let resultsPath = FileHandler.joinPaths(process.cwd(), 'test-results');
        let logPath = FileHandler.joinPaths(resultsPath, fileName);
        FileHandler.createFolder(resultsPath);
        if(clearFile){
            FileHandler.writeFile(logPath, '');
        }
        let writeLog = (...args) => FileHandler.appendToFile(logPath, E2eConsoleFileRedirect.formatArgs(args)+'\n');
        console.log = writeLog;
        console.error = writeLog;
        return writeLog;
    }

}

module.exports.E2eConsoleFileRedirect = E2eConsoleFileRedirect;
