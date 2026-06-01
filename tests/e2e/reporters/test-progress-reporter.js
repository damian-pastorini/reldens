/**
 *
 * Reldens - Test Progress Reporter
 *
 * Custom Playwright reporter: shows live step updates per test in TTY mode,
 * error details on failure, and a pass/fail summary at the end.
 *
 */

const util = require('util');
let flushTick = util.promisify(setImmediate);

class TestProgressReporter
{
    printsToStdio()
    {
        return true;
    }

    onBegin(config, suite)
    {
        this.total = suite.allTests().length;
        this.index = 0;
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
        this.hasActiveLine = false;
        process.stdout.write('Running '+this.total+' tests\n\n');
    }

    onTestBegin(test)
    {
        this.index++;
        this.hasActiveLine = false;
        process.stdout.write('→ ['+this.index+'/'+this.total+'] '+test.titlePath().join(' › ')+'\n');
    }

    onStepBegin(test, result, step)
    {
        if(!process.stdout.isTTY) {
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
        if(process.stdout.isTTY) {
            let clearLines = this.hasActiveLine ? '\r\x1b[2K\x1b[1A\x1b[2K' : '\x1b[1A\x1b[2K';
            process.stdout.write(clearLines);
        }
        process.stdout.write(' '+icon+' ['+this.index+'/'+this.total+'] '+test.titlePath().join(' › ')+' ('+time+')\n');
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
        }
        this.hasActiveLine = false;
    }

    async onEnd(result)
    {
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
