/**
 *
 * Reldens - Test Progress Reporter
 *
 * Custom Playwright reporter: shows live step updates per test in TTY mode,
 * error details on failure (the first error line and the last Playwright calls and test steps with their start time in
 * the test and their durations,
 * so a test timeout shows what was running), and a pass/fail summary at the end.
 *
 */

const util = require('util');
let flushTick = util.promisify(setImmediate);

class TestProgressReporter
{
    constructor()
    {
        this.lastStepsShown = 25;
        this.total = 0;
        this.index = 0;
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
        this.hasActiveLine = false;
        this.hasEnded = false;
        this.testsIndexes = {};
        this.isSingleWorker = false;
    }

    printsToStdio()
    {
        return true;
    }

    onBegin(config, suite)
    {
        this.total = suite.allTests().length;
        this.isSingleWorker = 1 === config.workers;
        process.once('exit', (exitCode) => this.reportAbortedRun(exitCode));
        process.stdout.write('Running '+this.total+' tests\n\n');
    }

    reportAbortedRun(exitCode)
    {
        if(this.hasEnded) {
            return;
        }
        process.stdout.write(
            '\nRun aborted with exit code '+exitCode+' during test '+this.index+' of '+this.total
            +' - '+this.passed+' passed  '+this.failed+' failed  '+this.skipped+' skipped'
            +', see test-results/server.log for the cause.\n'
        );
    }

    onTestBegin(test)
    {
        this.index++;
        this.testsIndexes[test.id] = this.index;
        this.hasActiveLine = false;
        process.stdout.write('→ ['+this.index+'/'+this.total+'] '+test.titlePath().join(' › ')+'\n');
    }

    onStepBegin(test, result, step)
    {
        if(!process.stdout.isTTY || !this.isSingleWorker) {
            return;
        }
        if('pw:api' !== step.category) {
            if('test.step' !== step.category) {
                return;
            }
        }
        if(this.hasActiveLine) {
            process.stdout.write('\r\x1b[2K');
        }
        this.hasActiveLine = true;
        process.stdout.write('   '+this.truncate(step.title, 90));
    }

    onTestEnd(test, result)
    {
        let icon = 'passed' === result.status
            ? 'ok'
            : ('skipped' === result.status ? 'skip' : 'fail');
        let time = (result.duration / 1000).toFixed(1)+'s';
        if(process.stdout.isTTY && this.isSingleWorker) {
            let clearLines = this.hasActiveLine ? '\r\x1b[2K\x1b[1A\x1b[2K' : '\x1b[1A\x1b[2K';
            process.stdout.write(clearLines);
        }
        let testIndex = this.testsIndexes[test.id];
        process.stdout.write(' '+icon+' ['+testIndex+'/'+this.total+'] '+test.titlePath().join(' › ')+' ('+time+')\n');
        if('passed' === result.status) {
            this.passed++;
        }
        if('skipped' === result.status) {
            this.skipped++;
        }
        if('failed' === result.status || 'timedOut' === result.status) {
            this.failed++;
            let error = result.errors && [...result.errors].shift();
            if(error && error.message) {
                let errorMessage = [...error.message.split('\n')].shift();
                process.stdout.write('     Error: '+this.truncate(errorMessage, 120)+'\n');
            }
            let failedTestSteps = this.collectSteps(result.steps || [], []);
            for(let step of failedTestSteps.slice(Math.max(0, failedTestSteps.length - this.lastStepsShown))) {
                process.stdout.write(
                    '       step at '+(step.startTime - result.startTime)+'ms: '+this.truncate(step.title, 100)
                    +' ('+step.duration+'ms'+(step.error ? ', failed' : '')+')\n'
                );
            }
        }
        this.hasActiveLine = false;
    }

    collectSteps(steps, collected)
    {
        for(let step of steps) {
            if('pw:api' === step.category || 'test.step' === step.category) {
                collected.push(step);
            }
            this.collectSteps(step.steps || [], collected);
        }
        return collected;
    }

    async onEnd(result)
    {
        this.hasEnded = true;
        try {
            let duration = result && result.duration ? result.duration : 0;
            let seconds = Math.round(duration / 1000);
            let durText = seconds < 60 ? seconds+'s' : Math.floor(seconds / 60)+'m '+(seconds % 60)+'s';
            let totalExecuted = this.passed + this.failed + this.skipped;
            process.stdout.write('\n '+this.passed+' passed  '+this.failed+' failed  '+this.skipped+' skipped  ('+durText+')\n');
            process.stdout.write(' Total tests executed: '+totalExecuted+' of '+this.total+'\n');
            await flushTick();
        } catch(error) {
            process.stderr.write('TestProgressReporter.onEnd error: '+(error && error.message ? error.message : error)+'\n');
        }
    }

    onError(error)
    {
        process.stdout.write(
            '\nGlobal error: '
            +(error && error.stack ? error.stack : (error && error.message ? error.message : String(error)))+'\n'
        );
    }

    truncate(text, maxLen)
    {
        if(text.length <= maxLen) {
            return text;
        }
        return text.slice(0, maxLen - 3)+'...';
    }
}

module.exports = TestProgressReporter;
module.exports.TestProgressReporter = TestProgressReporter;
