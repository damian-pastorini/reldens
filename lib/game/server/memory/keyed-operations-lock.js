/**
 *
 * Reldens - KeyedOperationsLock
 *
 * In memory lock of the operations running per key. The shared operations run once per key and every caller waiting
 * on the same key gets the same result, the queued operations run one after the other per key. The key is cleared
 * when its last operation ends. The operations must resolve their own errors, a rejected operation would keep the
 * next queued ones from running.
 *
 */

const { sc } = require('@reldens/utils');

class KeyedOperationsLock
{

    constructor()
    {
        /** @type {Object<string, Promise<any>>} */
        this.pendingByKey = {};
    }

    /**
     * @param {string|number} key
     * @param {function(): Promise<any>} operation
     * @returns {Promise<any>}
     */
    async share(key, operation)
    {
        if(!sc.hasOwn(this.pendingByKey, key)){
            this.pendingByKey[key] = operation();
        }
        return await this.settle(key, this.pendingByKey[key]);
    }

    /**
     * @param {string|number} key
     * @param {function(): Promise<any>} operation
     * @returns {Promise<any>}
     */
    async queue(key, operation)
    {
        this.pendingByKey[key] = sc.get(this.pendingByKey, key, Promise.resolve(false)).then(() => operation());
        return await this.settle(key, this.pendingByKey[key]);
    }

    /**
     * @param {string|number} key
     * @param {Promise<any>} pendingOperation
     * @returns {Promise<any>}
     */
    async settle(key, pendingOperation)
    {
        let operationResult = await pendingOperation;
        if(pendingOperation === this.pendingByKey[key]){
            delete this.pendingByKey[key];
        }
        return operationResult;
    }

}

module.exports.KeyedOperationsLock = KeyedOperationsLock;
