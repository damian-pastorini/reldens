/**
 *
 * Reldens - E2E Assets Endpoints
 *
 * Server side e2e endpoints that serve the browser assets of the e2e folder: the CrazyGames SDK mock the client ads
 * provider loads from its "sdkUrl" when a spec enables the mocked provider (AdMessagesPlayer), and the overlays
 * stylesheet of the mocked ad and the long run recording banner. Only the fixed files listed here are served, each one
 * read once when the endpoints are registered, so no request path reaches the file system.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class E2eAssetsEndpoints
{

    static ASSETS_PATH = '/api/e2e/assets/';
    static ASSETS_DIR = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'assets');
    static SDK_MOCK_FILE = 'crazy-games-sdk-mock.js';
    static OVERLAYS_FILE = 'e2e-overlays.css';
    static CONTENT_TYPES = {
        [E2eAssetsEndpoints.SDK_MOCK_FILE]: 'application/javascript',
        [E2eAssetsEndpoints.OVERLAYS_FILE]: 'text/css'
    };

    static registerEndpoints(serverManager)
    {
        for(let fileName of Object.keys(E2eAssetsEndpoints.CONTENT_TYPES)){
            let contents = FileHandler.readFile(FileHandler.joinPaths(E2eAssetsEndpoints.ASSETS_DIR, fileName));
            serverManager.app.get(E2eAssetsEndpoints.ASSETS_PATH+fileName, (request, response) => {
                response.type(E2eAssetsEndpoints.CONTENT_TYPES[fileName]).send(contents);
            });
        }
        Logger.info('[e2e-assets-endpoints] E2E assets endpoints registered.');
    }

}

module.exports.E2eAssetsEndpoints = E2eAssetsEndpoints;
