/**
 *
 * Reldens - Startup Guard
 *
 * Wraps each e2e server startup step with a timeout so a hang (for example a second game server
 * already bound to the same port or database) fails fast with a clear message on stderr and ends
 * the process, instead of blocking the run silently.
 *
 */

const { setTimeout: setTimeoutPromise } = require('node:timers/promises');

class StartupGuard
{
    static SERVER_START_TIMEOUT = 120000;

    static async runStep(startupPromise, label)
    {
        let abortController = new AbortController();
        let timeoutValue = 'reldens-startup-timeout';
        let timeoutPromise = setTimeoutPromise(
            StartupGuard.SERVER_START_TIMEOUT,
            timeoutValue,
            {signal: abortController.signal}
        ).catch(() => timeoutValue);
        let winner = timeoutValue;
        try {
            winner = await Promise.race([startupPromise, timeoutPromise]);
        } catch(error) {
            abortController.abort();
            StartupGuard.abort(label+' errored - '+error.message);
        }
        abortController.abort();
        if(timeoutValue === winner) {
            StartupGuard.abort(label+' timed out after '+StartupGuard.SERVER_START_TIMEOUT+'ms');
        }
        return winner;
    }

    static abort(message)
    {
        process.stderr.write('\nServer: FAILED to start - '+message+'\n');
        process.stderr.write('Server: aborting e2e run. If another game server is already running against the same port or database, stop it and retry.\n');
        process.exit(1);
    }
}

module.exports.StartupGuard = StartupGuard;
