/**
 *
 * Reldens - Recording Step Read Timer
 *
 * Long run only: keeps every step of the recording banner on screen long enough to be read. The page keeps the time the
 * current step was shown, and the next step or the end of the recording waits for the rest of its reading time.
 *
 */

const { TimeConstants } = require('./time-constants');
const { Logger } = require('@reldens/utils');

class RecordingStepReadTimer
{

    static async markShown(page)
    {
        await page.evaluate(() => {
            window.e2eStepShownAt = Date.now();
        });
    }

    static async waitForRead(page)
    {
        let readLeftMs = await page.evaluate(
            (readMs) => Math.max(0, (window.e2eStepShownAt || 0) + readMs - Date.now()),
            TimeConstants.STEP_READ
        ).catch((error) => {
            Logger.error('[video] Could not read the time of the recording step: '+error.message);
            return 0;
        });
        if(0 < readLeftMs){
            await page.waitForTimeout(readLeftMs);
        }
    }

}

module.exports.RecordingStepReadTimer = RecordingStepReadTimer;
