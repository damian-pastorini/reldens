/**
 *
 * Reldens - LoggerOutputCapture
 *
 * Runs a callback while the Logger callback collects the lines of one log level, restores the previous Logger callback
 * and active levels, rethrows the callback error if any, and returns the collected lines as a single text.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class LoggerOutputCapture
{

    /**
     * @param {number} logLevel
     * @param {function(): Promise<any>} runCallback
     * @returns {Promise<string>}
     */
    static async capture(logLevel, runCallback)
    {
        let loggedLines = [];
        let runError = false;
        let previousCallback = Logger.callback;
        let previousLevels = Logger.activeLogLevels;
        Logger.activeLogLevels = [logLevel];
        Logger.callback = (...args) => loggedLines.push(sc.toJsonString(args));
        await runCallback().catch((error) => {
            runError = error;
        });
        Logger.callback = previousCallback;
        Logger.activeLogLevels = previousLevels;
        if(runError){
            throw runError;
        }
        return loggedLines.join(' ');
    }

}

module.exports.LoggerOutputCapture = LoggerOutputCapture;
