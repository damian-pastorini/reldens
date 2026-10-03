/**
 *
 * Reldens - Client Bundle Check
 *
 * Tells whether the app under test still serves the raw theme entry point instead of a bundled client.
 * The e2e setup uses it to run the bundler before the tests instead of failing every spec on a missing
 * window.reldens.
 *
 */

const { FileHandler } = require('@reldens/server-utils');

class ClientBundleCheck
{

    static isMissing(serverPath)
    {
        let distIndexContents = FileHandler.readFile(FileHandler.joinPaths(serverPath, 'dist', 'index.html'));
        if(!distIndexContents){
            return true;
        }
        return -1 !== String(distIndexContents).indexOf('src="./index.js"');
    }

}

module.exports.ClientBundleCheck = ClientBundleCheck;
