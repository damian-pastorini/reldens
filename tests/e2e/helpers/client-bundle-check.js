/**
 *
 * Reldens - Client Bundle Check
 *
 * Tells whether the app under test still serves the raw theme entry point instead of a bundled client, or serves a
 * bundle older than the client sources (any lib file of the checkout or theme plugins file of the app outside a server
 * folder, or any html or scss file of the tested theme outside its assets folder, changed after the bundle was built).
 * A missing tested theme folder needs the bundle too. The e2e setup uses it to run the bundler before the tests instead
 * of failing every spec on a missing window.reldens or testing an outdated client or outdated theme styles.
 *
 */

const { FileHandler } = require('@reldens/server-utils');

class ClientBundleCheck
{

    static SOURCES_FOLDER = 'lib';
    static THEME_FOLDER = 'theme';
    static PLUGINS_FOLDER = 'plugins';
    static SERVER_FOLDER = 'server';
    static ASSETS_FOLDER = 'assets';
    static SOURCES_EXTENSION = '.js';
    static THEME_SOURCES_EXTENSIONS = ['.html', '.scss'];

    static isMissing(serverPath)
    {
        let distIndexContents = FileHandler.readFile(FileHandler.joinPaths(serverPath, 'dist', 'index.html'));
        if(!distIndexContents){
            return true;
        }
        return -1 !== String(distIndexContents).indexOf('src="./index.js"');
    }

    static isOutdated(serverPath, checkoutPath, themeName)
    {
        let bundleStats = FileHandler.getFileStats(FileHandler.joinPaths(serverPath, 'dist', 'index.html'));
        let themePath = FileHandler.joinPaths(serverPath, ClientBundleCheck.THEME_FOLDER, themeName);
        if(!bundleStats || !FileHandler.exists(themePath)){
            return true;
        }
        return [
            ...ClientBundleCheck.findSources(
                FileHandler.joinPaths(checkoutPath, ClientBundleCheck.SOURCES_FOLDER),
                ClientBundleCheck.isClientSource
            ),
            ...ClientBundleCheck.findSources(
                FileHandler.joinPaths(serverPath, ClientBundleCheck.THEME_FOLDER, ClientBundleCheck.PLUGINS_FOLDER),
                ClientBundleCheck.isClientSource
            ),
            ...ClientBundleCheck.findSources(themePath, ClientBundleCheck.isThemeSource)
        ].some(sourcePath => bundleStats.mtimeMs < FileHandler.getFileStats(sourcePath).mtimeMs);
    }

    static findSources(sourcesPath, isSource)
    {
        return FileHandler.readFolder(sourcesPath, {recursive: true})
            .filter(relativePath => isSource(relativePath))
            .map(relativePath => FileHandler.joinPaths(sourcesPath, relativePath));
    }

    static isThemeSource(relativePath)
    {
        if(relativePath.split(/[\\/]/).includes(ClientBundleCheck.ASSETS_FOLDER)){
            return false;
        }
        return ClientBundleCheck.THEME_SOURCES_EXTENSIONS.some(extension => relativePath.endsWith(extension));
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
