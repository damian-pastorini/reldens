/**
 *
 * Reldens - Client Bundle Check
 *
 * Tells whether the app under test still serves the raw theme entry point instead of a bundled client, or serves a
 * bundle older than the client sources (any lib file of the checkout or theme plugins file of the app outside a server
 * folder, or any html or scss file of the tested theme outside its assets folder, changed after the bundle was built,
 * or the app packages were installed after it: its node_modules lock file is newer, like after a new @reldens release).
 * A missing tested theme folder, or a bundle built from another theme (the dist index does not load the tested theme
 * bundle files, like after the app build script bundled the app theme), needs the bundle too. The e2e setup uses it to run the bundler before the tests instead
 * of failing every spec on a missing window.reldens or testing an outdated client or outdated theme styles. Before the
 * check the setup syncs the tested theme from the checkout default theme (every file whose contents differ is copied,
 * except the config.js the server generates for the theme, the files only the tested theme has are kept), so every run
 * tests the theme of the reldens source; a synced file makes the setup bundle the client again (the copy keeps the
 * source modification time, so it can be older than the bundle).
 *
 */

const { FileHandler } = require('@reldens/server-utils');

class ClientBundleCheck
{

    static SOURCES_FOLDER = 'lib';
    static THEME_FOLDER = 'theme';
    static SOURCE_THEME_FOLDER = 'default';
    static GENERATED_THEME_FILES = ['config.js'];
    static PLUGINS_FOLDER = 'plugins';
    static SERVER_FOLDER = 'server';
    static ASSETS_FOLDER = 'assets';
    static SOURCES_EXTENSION = '.js';
    static THEME_SOURCES_EXTENSIONS = ['.html', '.scss'];
    static INSTALLED_PACKAGES_LOCK = ['node_modules', '.package-lock.json'];

    static syncTestedTheme(checkoutPath, serverPath, themeName)
    {
        let sourcePath = FileHandler.joinPaths(
            checkoutPath,
            ClientBundleCheck.THEME_FOLDER,
            ClientBundleCheck.SOURCE_THEME_FOLDER
        );
        let themePath = FileHandler.joinPaths(serverPath, ClientBundleCheck.THEME_FOLDER, themeName);
        let syncedFiles = [];
        for(let relativePath of FileHandler.readFolder(sourcePath, {recursive: true})){
            let sourceFile = FileHandler.joinPaths(sourcePath, relativePath);
            let themeFile = FileHandler.joinPaths(themePath, relativePath);
            if(
                ClientBundleCheck.GENERATED_THEME_FILES.includes(relativePath)
                || !FileHandler.isFile(sourceFile)
                || FileHandler.compareFiles(sourceFile, themeFile)
            ){
                continue;
            }
            FileHandler.createFolder(FileHandler.getFolderName(themeFile));
            if(FileHandler.copyFile(sourceFile, themeFile)){
                syncedFiles.push(relativePath);
            }
        }
        return syncedFiles;
    }

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
        let distIndexPath = FileHandler.joinPaths(serverPath, 'dist', 'index.html');
        let bundleStats = FileHandler.getFileStats(distIndexPath);
        let themePath = FileHandler.joinPaths(serverPath, ClientBundleCheck.THEME_FOLDER, themeName);
        if(
            !bundleStats
            || !FileHandler.exists(themePath)
            || -1 === String(FileHandler.readFile(distIndexPath)).indexOf('/'+themeName+'.')
        ){
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
            ...ClientBundleCheck.findSources(themePath, ClientBundleCheck.isThemeSource),
            ...[FileHandler.joinPaths(serverPath, ...ClientBundleCheck.INSTALLED_PACKAGES_LOCK)].filter(
                lockPath => FileHandler.exists(lockPath)
            )
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
