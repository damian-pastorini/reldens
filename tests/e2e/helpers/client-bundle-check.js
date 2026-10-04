/**
 *
 * Reldens - Client Bundle Check
 *
 * Tells whether the app under test still serves the raw theme entry point instead of a bundled client, or serves a
 * bundle older than the client sources of the checkout (any lib file outside a server folder changed after the
 * bundle was built). The e2e setup uses it to run the bundler before the tests instead of failing every spec on a
 * missing window.reldens or testing an outdated client.
 *
 */

const { FileHandler } = require('@reldens/server-utils');

class ClientBundleCheck
{

    static SOURCES_FOLDER = 'lib';
    static SERVER_FOLDER = 'server';
    static SOURCES_EXTENSION = '.js';

    static isMissing(serverPath)
    {
        let distIndexContents = FileHandler.readFile(FileHandler.joinPaths(serverPath, 'dist', 'index.html'));
        if(!distIndexContents){
            return true;
        }
        return -1 !== String(distIndexContents).indexOf('src="./index.js"');
    }

    static isOutdated(serverPath, checkoutPath)
    {
        let bundleStats = FileHandler.getFileStats(FileHandler.joinPaths(serverPath, 'dist', 'index.html'));
        if(!bundleStats){
            return true;
        }
        return ClientBundleCheck.findClientSources(
            FileHandler.joinPaths(checkoutPath, ClientBundleCheck.SOURCES_FOLDER)
        ).some(sourcePath => bundleStats.mtimeMs < FileHandler.getFileStats(sourcePath).mtimeMs);
    }

    static findClientSources(sourcesPath)
    {
        return FileHandler.readFolder(sourcesPath, {recursive: true})
            .filter(relativePath => ClientBundleCheck.isClientSource(relativePath))
            .map(relativePath => FileHandler.joinPaths(sourcesPath, relativePath));
    }

    static isClientSource(relativePath)
    {
        if(!relativePath.endsWith(ClientBundleCheck.SOURCES_EXTENSION)){
            return false;
        }
        return !relativePath.split(/[\\/]/).includes(ClientBundleCheck.SERVER_FOLDER);
    }

}

module.exports.ClientBundleCheck = ClientBundleCheck;
