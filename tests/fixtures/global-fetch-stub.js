/**
 *
 * Reldens - GlobalFetchStub
 *
 * Runs a test callback with the global fetch replaced by the given fake fetch, and restores the original fetch after
 * the callback, also when it throws.
 *
 */

class GlobalFetchStub
{

    /**
     * @param {Function} fakeFetch
     * @param {Function} testCallback
     * @returns {Promise<void>}
     */
    static async withFetch(fakeFetch, testCallback)
    {
        let originalFetch = global.fetch;
        global.fetch = fakeFetch;
        try {
            await testCallback();
        } catch(error) {
            global.fetch = originalFetch;
            throw error;
        }
        global.fetch = originalFetch;
    }

}

module.exports.GlobalFetchStub = GlobalFetchStub;
