/**
 *
 * Reldens - ScheduledTimeouts
 *
 * Captures the setTimeout calls made while a callback runs, instead of starting them, and runs the captured callbacks
 * on demand in their scheduled order (the timeouts a run callback schedules while the capture is still active run in
 * the same call), so a test controls when every delayed step happens and reads the delays used.
 *
 */

class ScheduledTimeouts
{

    constructor()
    {
        /** @type {Array<{timeoutCallback: Function, delayMs: number}>} */
        this.scheduledTimeouts = [];
    }

    /**
     * @param {Function} callback
     * @returns {Promise<*>}
     */
    async capture(callback)
    {
        let originalSetTimeout = global.setTimeout;
        global.setTimeout = (timeoutCallback, delayMs) => this.scheduledTimeouts.push({timeoutCallback, delayMs});
        let callbackResult = false;
        try {
            callbackResult = await callback();
        } catch(error) {
            global.setTimeout = originalSetTimeout;
            throw error;
        }
        global.setTimeout = originalSetTimeout;
        return callbackResult;
    }

    /**
     * @returns {Array<number>}
     */
    runAll()
    {
        let delays = [];
        for(let i = 0; i < this.scheduledTimeouts.length; i++){
            delays.push(this.scheduledTimeouts[i].delayMs);
            this.scheduledTimeouts[i].timeoutCallback();
        }
        this.scheduledTimeouts = [];
        return delays;
    }

}

module.exports.ScheduledTimeouts = ScheduledTimeouts;
