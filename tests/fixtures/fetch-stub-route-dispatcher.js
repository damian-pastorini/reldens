/**
 *
 * Reldens - FetchStubRouteDispatcher
 *
 * Runs a test callback with the global fetch delivering every request to the route handler (handleRouteRequest) of the
 * server whose URL starts the requested URL, answering its recorded JSON response (or a failed status when the route is
 * not available), and waits for the requests started without await by the callback before restoring the fetch.
 *
 */

const { GlobalFetchStub } = require('./global-fetch-stub');
const { JsonResponseRecorder } = require('./json-response-recorder');
const { sc } = require('@reldens/utils');
const timersPromises = require('node:timers/promises');

class FetchStubRouteDispatcher
{

    /**
     * @param {Object<string, Object>} routeHandlersByServerUrl
     * @param {Function} testCallback
     * @param {boolean} [isRouteAvailable]
     * @returns {Promise<void>}
     */
    static async withServers(routeHandlersByServerUrl, testCallback, isRouteAvailable = true)
    {
        let routedFetch = async (requestUrl, options) => {
            let serverUrl = Object.keys(routeHandlersByServerUrl).find(handlerUrl => requestUrl.startsWith(handlerUrl));
            let responses = [];
            await routeHandlersByServerUrl[serverUrl].handleRouteRequest(
                {body: sc.parseJson(options.body)},
                new JsonResponseRecorder().create(responses)
            );
            return {ok: isRouteAvailable, status: isRouteAvailable ? 200 : 503, json: async () => [...responses].pop()};
        };
        await GlobalFetchStub.withFetch(routedFetch, async () => {
            await testCallback();
            await timersPromises.setImmediate();
        });
    }

}

module.exports.FetchStubRouteDispatcher = FetchStubRouteDispatcher;
