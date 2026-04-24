/**
 *
 * Reldens - Test Progress Reporter
 *
 * Custom Playwright reporter: shows live step updates per test in TTY mode,
 * error details on failure, and a pass/fail summary at the end.
 *
 */

class TestProgressReporter
{
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
        let icon = 'passed' === result.status ? 'ok' : ('skipped' === result.status ? '-' : '✗');
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
                let msg = [...error.message.split('\n')].shift();
                process.stdout.write('     Error: '+this.truncate(msg, 120)+'\n');
            }
        }
        this.hasActiveLine = false;
    }

    onEnd(result)
    {
        let seconds = Math.round(result.duration / 1000);
        let durText = seconds < 60 ? seconds+'s' : Math.floor(seconds / 60)+'m '+seconds % 60+'s';
        process.stdout.write('\n '+this.passed+' passed  '+this.failed+' failed  '+this.skipped+' skipped  ('+durText+')\n');
    }

    truncate(text, maxLen)
    {
        if(text.length <= maxLen) {
            return text;
        }
        return text.slice(0, maxLen - 3)+'...';
    }
}

module.exports.TestProgressReporter = TestProgressReporter;
