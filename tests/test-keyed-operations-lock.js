/**
 *
 * Reldens - Test Keyed Operations Lock
 *
 */

const { BaseTest } = require('./base-test');
const { KeyedOperationsLock } = require('../lib/game/server/memory/keyed-operations-lock');
const timersPromises = require('timers/promises');

class TestKeyedOperationsLock extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.operationDelayMs = 5;
    }

    createDelayedOperation(operationsEvents, operationName, delayMs)
    {
        return async () => {
            operationsEvents.push(operationName+' start');
            await timersPromises.setTimeout(delayMs);
            operationsEvents.push(operationName+' end');
            return {operationName};
        };
    }

    async testTheSharedOperationRunsOncePerKey()
    {
        await this.test('the callers sharing a key run the operation once and get the same result', async () => {
            let operationsLock = new KeyedOperationsLock();
            let operationsEvents = [];
            let sharedOperation = this.createDelayedOperation(operationsEvents, 'load', this.operationDelayMs);
            let results = await Promise.all([
                operationsLock.share(10, sharedOperation),
                operationsLock.share(10, sharedOperation)
            ]);
            this.assert.deepStrictEqual(operationsEvents, ['load start', 'load end']);
            this.assert.strictEqual(results.shift(), results.shift());
            this.assert.deepStrictEqual(operationsLock.pendingByKey, {});
        });
    }

    async testTheQueuedOperationsRunOneAfterTheOther()
    {
        await this.test('the queued operations of a key run one after the other in the queued order', async () => {
            let operationsLock = new KeyedOperationsLock();
            let operationsEvents = [];
            let slowerOperation = this.createDelayedOperation(operationsEvents, 'first', this.operationDelayMs * 2);
            let fasterOperation = this.createDelayedOperation(operationsEvents, 'second', this.operationDelayMs);
            let results = await Promise.all([
                operationsLock.queue(1001, slowerOperation),
                operationsLock.queue(1001, fasterOperation)
            ]);
            this.assert.deepStrictEqual(operationsEvents, ['first start', 'first end', 'second start', 'second end']);
            this.assert.deepStrictEqual(results, [{operationName: 'first'}, {operationName: 'second'}]);
            this.assert.deepStrictEqual(operationsLock.pendingByKey, {});
        });
    }

    async testTheOperationsOfDifferentKeysRunTogether()
    {
        await this.test('the queued operations of different keys do not wait for each other', async () => {
            let operationsLock = new KeyedOperationsLock();
            let operationsEvents = [];
            let firstOperation = this.createDelayedOperation(operationsEvents, 'first', this.operationDelayMs);
            let secondOperation = this.createDelayedOperation(operationsEvents, 'second', this.operationDelayMs);
            await Promise.all([operationsLock.queue(1001, firstOperation), operationsLock.queue(1002, secondOperation)]);
            this.assert.deepStrictEqual(operationsEvents.slice(0, 2), ['first start', 'second start']);
        });
    }

}

module.exports.TestKeyedOperationsLock = TestKeyedOperationsLock;
