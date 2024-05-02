/**
 *
 * Reldens - ThemeManager
 *
 */

const fs = require('fs');
const path = require('path');
const TemplateEngine = require('mustache');
const { Parcel } = require('@parcel/core');
const { FileHandler } = require('./file-handler');
const { ErrorManager, Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../constants');
const babelTransformer = require("@parcel/transformer-babel/lib/BabelTransformer");

class ThemeManager
{

    projectRoot = '';
    projectRootPackageJson = '';
    envFilePath = '';
    installationLockPath = '';
    reldensModulePath = '';
    reldensModuleLibPath = '';
    reldensModuleThemePath = '';
    reldensModuleDefaultThemePath = '';
    reldensModuleDefaultThemeAssetsPath = '';
    reldensModuleThemePluginsPath = '';
    reldensModuleInstallerPath = '';
    reldensModulePathInstallTemplatesFolder = '';
    distPath = '';
    assetsDistPath = '';
    cssDistPath = '';
    themePath = '';
    projectThemeName = GameConst.STRUCTURE.DEFAULT;
    projectThemePath = '';
    projectPluginsPath = '';
    projectAssetsPath = '';
    projectCssPath = '';
    projectIndexPath = '';
    defaultBrowserBundleOptions = {};

    constructor(props)
    {
        if(!sc.hasOwn(props, 'projectRoot')){
            ErrorManager.error('Missing project property.');
        }
        this.encoding = (process.env.RELDENS_DEFAULT_ENCODING || 'utf8');
        this.setupPaths(props);
    }

    setupPaths(props)
    {
        this.projectRoot = sc.get(props, 'projectRoot', '');
        this.projectRootPackageJson = FileHandler.joinPaths(this.projectRoot, 'package.json');
        this.envFilePath = FileHandler.joinPaths(this.projectRoot, '.env');
        this.installationLockPath = FileHandler.joinPaths(this.projectRoot, 'install.lock');
        this.projectThemeName = sc.get(props, 'projectThemeName', GameConst.STRUCTURE.DEFAULT);
        this.reldensModulePath = FileHandler.joinPaths(this.projectRoot, 'node_modules', 'reldens');
        this.reldensModuleLibPath = FileHandler.joinPaths(this.reldensModulePath, GameConst.STRUCTURE.LIB);
        this.reldensModuleThemePath = FileHandler.joinPaths(this.reldensModulePath, GameConst.STRUCTURE.THEME);
        this.reldensModuleDefaultThemePath = FileHandler.joinPaths(this.reldensModuleThemePath, GameConst.STRUCTURE.DEFAULT);
        this.reldensModuleDefaultThemeAssetsPath = FileHandler.joinPaths(
            this.reldensModuleDefaultThemePath,
            GameConst.STRUCTURE.ASSETS
        );
        this.reldensModuleThemePluginsPath = FileHandler.joinPaths(this.reldensModuleThemePath, GameConst.STRUCTURE.PLUGINS);
        this.reldensModuleInstallerPath = FileHandler.joinPaths(this.reldensModulePath, GameConst.STRUCTURE.INSTALLER_FOLDER);
        this.reldensModuleInstallerIndexPath = FileHandler.joinPaths(
            this.reldensModuleInstallerPath,
            GameConst.STRUCTURE.INSTALLER_INDEX
        );
        this.reldensModulePathInstallTemplatesFolder = FileHandler.joinPaths(
            this.reldensModulePath,
            'lib',
            'game',
            'server',
            'install-templates'
        );
        this.reldensModulePathInstallTemplateEnvDist = FileHandler.joinPaths(
            this.reldensModulePathInstallTemplatesFolder,
            '.env.dist'
        );
        this.reldensModulePathInstallTemplateKnexDist = FileHandler.joinPaths(
            this.reldensModulePathInstallTemplatesFolder,
            'knexfile.js.dist'
        );
        this.installerPath = FileHandler.joinPaths(this.projectRoot, GameConst.STRUCTURE.INSTALLER_FOLDER);
        this.installerPathIndex = FileHandler.joinPaths(this.installerPath, GameConst.STRUCTURE.INSTALLER_INDEX);
        this.distPath = FileHandler.joinPaths(this.projectRoot, GameConst.STRUCTURE.DIST);
        this.assetsDistPath = FileHandler.joinPaths(this.distPath, GameConst.STRUCTURE.ASSETS);
        this.cssDistPath = FileHandler.joinPaths(this.distPath, GameConst.STRUCTURE.CSS);
        this.themePath = FileHandler.joinPaths(this.projectRoot, GameConst.STRUCTURE.THEME);
        this.projectThemePath = FileHandler.joinPaths(this.themePath, this.projectThemeName);
        this.projectPluginsPath = FileHandler.joinPaths(this.themePath, GameConst.STRUCTURE.PLUGINS);
        this.projectAssetsPath = FileHandler.joinPaths(this.projectThemePath, GameConst.STRUCTURE.ASSETS);
        this.projectCssPath = FileHandler.joinPaths(this.projectThemePath, GameConst.STRUCTURE.CSS);
        this.projectIndexPath = FileHandler.joinPaths(this.projectThemePath, GameConst.STRUCTURE.INDEX);
    }

    paths()
    {
        return {
            projectRoot: this.projectRoot,
            reldensModulePath: this.reldensModulePath,
            reldensModuleLibPath: this.reldensModuleLibPath,
            reldensModuleThemePath: this.reldensModuleThemePath,
            reldensModuleDefaultThemePath: this.reldensModuleDefaultThemePath,
            reldensModuleDefaultThemeAssetsPath: this.reldensModuleDefaultThemeAssetsPath,
            reldensModuleThemePluginsPath: this.reldensModuleThemePluginsPath,
            distPath: this.distPath,
            assetsDistPath: this.assetsDistPath,
            themePath: this.themePath,
            projectThemePath: this.projectThemePath,
            projectPluginsPath: this.projectPluginsPath,
            projectAssetsPath: this.projectAssetsPath,
            projectIndexPath: this.projectIndexPath
        };
    }

    assetPath(...args)
    {
        return FileHandler.joinPaths(this.projectAssetsPath, ...args);
    }

    permissionsCheck()
    {
        return FileHandler.permissionsCheck(this.projectRoot);
    }

    resetDist()
    {
        this.removeDist();
        FileHandler.createFolder(this.distPath);
        FileHandler.createFolder(this.assetsDistPath);
        FileHandler.createFolder(this.cssDistPath);
        Logger.info('Reset "dist" folder, created: '+this.distPath);
    }

    removeDist()
    {
        return FileHandler.removeFolder(this.distPath);
    }

    installDefaultTheme()
    {
        FileHandler.copyFolderSync(this.reldensModuleDefaultThemePath, this.projectThemePath);
        FileHandler.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath);
        FileHandler.copyFolderSync(this.reldensModuleDefaultThemePath, this.distPath);
        Logger.info('Install "default" theme:'
            +'\n'+this.reldensModuleDefaultThemePath+' > '+this.projectThemePath
            +'\n'+this.reldensModuleThemePluginsPath+' > '+this.projectPluginsPath
            +'\n'+this.reldensModuleDefaultThemePath+' > '+this.distPath
        );
    }

    copyAssetsToDist()
    {
        FileHandler.copyFolderSync(this.projectAssetsPath, this.assetsDistPath);
        Logger.info(
            'Copied "assets" to "dist" from:'
            +'\n'+this.projectAssetsPath+' > '+this.assetsDistPath
        );
    }

    copyFolderSync(from, to)
    {
        return FileHandler.copyFolderSync(from, to);
    }

    copyKnexFile()
    {
        let knexFile = FileHandler.joinPaths(this.projectRoot, 'knexfile.js');
        if(fs.existsSync(knexFile)){
            Logger.info('File already exists: knexfile.js');
            return false;
        }
        fs.copyFileSync(
            FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, 'knexfile.js.dist'),
            knexFile
        );
        Logger.info('Reminder: edit the knexfile.js file!');
    }

    copyEnvFile()
    {
        if(fs.existsSync(this.envFilePath)){
            Logger.info('File already exists: .env');
            return false;
        }
        fs.copyFileSync(
            FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, '.env.dist'),
            this.envFilePath
        );
        Logger.info('Reminder: edit the .env file!');
    }

    async copyIndex(override = false)
    {
        let indexFile = FileHandler.joinPaths(this.projectRoot, 'index.js');
        if(fs.existsSync(indexFile) && !override){
            Logger.info('File already exists: index.js');
            return false;
        }
        let fileContent = FileHandler.fetchFileContents(
            FileHandler.joinPaths(this.reldensModuleThemePath, 'index.js.dist'),
        );
        let parsedIndexContents = await TemplateEngine.render(
            fileContent,
            {yourThemeName: this.projectThemeName ?? 'default'}
        );
        try {
            await FileHandler.updateFileContents(indexFile, parsedIndexContents.toString())
        } catch (error) {
            Logger.error('Failed to create index.js file.', error);
        }
    }

    copyDefaultAssets()
    {
        FileHandler.copyFolderSync(this.reldensModuleDefaultThemeAssetsPath, this.assetsDistPath);
        Logger.info(
            'Copied default assets:'+
            '\n'+this.reldensModuleDefaultThemeAssetsPath+' > '+this.assetsDistPath
        );
    }

    copyDefaultTheme()
    {
        FileHandler.copyFolderSync(this.reldensModuleDefaultThemePath, this.projectThemePath);
        Logger.info(
            'Copied default theme:'+
            '\n'+this.reldensModuleDefaultThemePath+' > '+this.projectThemePath
        );
    }

    copyCustomAssets()
    {
        FileHandler.copyFolderSync(this.projectAssetsPath, this.assetsDistPath);
        Logger.info(
            'Copied custom assets:'+
            '\n'+this.projectAssetsPath+' > '+this.assetsDistPath
        );
    }

    copyPackage()
    {
        FileHandler.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath);
        Logger.info(
            'Copied plugins:'+
            '\n'+this.reldensModuleThemePluginsPath+' > '+this.projectPluginsPath
        );
    }

    async buildCss()
    {
        let themeScss = FileHandler.joinPaths(this.projectCssPath, GameConst.STRUCTURE.SCSS_FILE).toString();
        let bundler = this.createCssBundler(themeScss);
        try {
            let { buildTime } = await bundler.run();
            Logger.info('Built Game CSS in '+buildTime+'ms!');
        } catch (err) {
            Logger.critical({'Parcel diagnostics for error': sc.get(err, 'diagnostics', err)});
            ErrorManager.error('Parcel build CSS process failed.');
        }
    }

    async buildAdminCss()
    {
        let bundler = this.createCssBundler(
            FileHandler.joinPaths(this.projectCssPath, GameConst.STRUCTURE.ADMIN_SCSS_FILE)
        );
        try {
            let { buildTime } = await bundler.run();
            Logger.info('Built Admin CSS in '+buildTime+'ms!');
        } catch (err) {
            Logger.critical({'Parcel diagnostics for error': sc.get(err, 'diagnostics', err)});
            return false;
        }
        FileHandler.createFolder(this.cssDistPath);
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.projectCssPath, GameConst.STRUCTURE.ADMIN_CSS_FILE),
            FileHandler.joinPaths(this.cssDistPath, GameConst.STRUCTURE.ADMIN_CSS_FILE)
        );
    }

    async buildSkeleton()
    {
        await this.buildCss();
        await this.buildClient();
        Logger.info('Built Skeleton.');
    }

    async buildClient()
    {
        let elementsCollection = FileHandler.readFolder(this.projectThemePath);
        for(let element of elementsCollection){
            if(-1 === element.indexOf('.html')){
                continue;
            }
            let elementPath = FileHandler.joinPaths(this.projectThemePath, element);
            if(!FileHandler.isFile(elementPath)){
                continue;
            }
            try {
                let bundler = this.createBrowserBundler(elementPath);
                let { buildTime } = await bundler.run();
                Logger.info('Built '+elementPath+' in '+buildTime+'ms!');
            } catch (err) {
                Logger.critical({'Parcel diagnostics for error': sc.get(err, 'diagnostics', err), elementPath});
                ErrorManager.error('Parcel build Game Client process failed.');
            }
        }
    }

    async clearBundlerCache(folderPath)
    {
        FileHandler.removeFolder(FileHandler.joinPaths(folderPath, '.parcel-cache'));
    }

    async buildInstaller()
    {
        try {
            let bundleOptions = this.generateDefaultBrowserBundleOptions(this.reldensModuleInstallerIndexPath);
            FileHandler.createFolder(this.installerPath);
            bundleOptions.targets.modern.distDir = this.installerPath;
            bundleOptions.defaultTargetOptions.distDir = this.installerPath;
            let bundler = new Parcel(bundleOptions);
            let { buildTime } = await bundler.run();
            Logger.info('Built '+this.reldensModuleInstallerIndexPath+' in '+buildTime+'ms!');
        } catch (err) {
            Logger.critical('Parcel diagnostics for error on build installer.', sc.get(err, 'diagnostics', err));
            ErrorManager.error('Parcel build installer process failed.');
        }
    }

    createBrowserBundler(entryPath)
    {
        return new Parcel(this.generateDefaultBrowserBundleOptions(entryPath));
    }

    generateDefaultBrowserBundleOptions(entryPath)
    {
        this.defaultBrowserBundleOptions = {
            defaultConfig: 'reldens/lib/bundlers/drivers/parcel-config',
            shouldDisableCache: true,
            targets: {
                modern: {
                    engines: {
                        browsers: ['> 0.5%, last 2 versions, not dead']
                    },
                    distDir: this.distPath,
                    outputFormat: 'esmodule'
                },
            },
            entries: entryPath,
            logLevel: 'verbose',
            defaultTargetOptions: {
                shouldDisableCache: true,
                shouldOptimize: true,
                sourceMaps: false,
                distEntry: entryPath,
                distDir: this.distPath,
                isLibrary: false,
                outputFormat: 'esmodule'
            }
        };
        return this.defaultBrowserBundleOptions;
    }

    createCssBundler(entryPath)
    {
        return new Parcel({
            defaultConfig: 'reldens/lib/bundlers/drivers/parcel-config',
            entries: entryPath,
            shouldDisableCache: true,
            defaultTargetOptions: {
                shouldDisableCache: true,
                shouldOptimize: true,
                sourceMaps: false,
                distDir: this.projectCssPath,
                isLibrary: false,
                outputFormat: 'esmodule',
                publicUrl: './'
            }
        });
    }

    copyNew()
    {
        this.copyDefaultAssets();
        this.copyDefaultTheme();
        this.copyPackage();
    }

    async fullRebuild()
    {
        this.copyNew();
        await this.buildSkeleton();
    }

    async installSkeleton()
    {
        await this.copyIndex(true);
        await this.copyServerFiles();
        this.resetDist();
        await this.fullRebuild();
    }

    async createApp()
    {
        await this.copyIndex(true);
        await this.updatePackageJson();
        this.validateOrCreateTheme();
        this.resetDist();
        await this.fullRebuild();
    }

    async copyServerFiles()
    {
        this.copyEnvFile();
        this.copyKnexFile();
        await this.copyIndex();
    }

    distPathExists()
    {
        let result = FileHandler.exists(this.distPath);
        Logger.info('Dist path: '+this.distPath, 'Dist folder exists? '+(result ? 'yes' : 'no'));
        return result;
    }

    themePathExists()
    {
        let result = FileHandler.exists(this.projectThemePath);
        Logger.info('Theme path: '+this.projectThemePath, 'Theme folder exists? '+(result ? 'yes' : 'no'));
        return result;
    }

    validateOrCreateTheme()
    {
        let distExists = this.distPathExists();
        let themeExists = this.themePathExists();
        if(false === themeExists){
            this.installDefaultTheme();
            Logger.error(
                'Project theme folder was not found: '+this.projectThemeName
                +'\nA copy from default has been made.'
            );
        }
        if(false === distExists){
            this.copyAssetsToDist();
        }
    }

    async loadAndRenderTemplate(filePath, params)
    {
        if(!FileHandler.exists(filePath)){
            Logger.error('Template not found.', {filePath});
            return false;
        }
        let fileContent = FileHandler.fetchFileContents(filePath);
        return await TemplateEngine.render(fileContent, params);
    }

    async createClientBundle()
    {
        // @TODO - BETA - Remove this function, just move to an auto-installation on first run feature.
        let runBundler = 1 === Number(process.env.RELDENS_ALLOW_RUN_BUNDLER || 0) || false;
        if(!runBundler){
            return false;
        }
        let forceResetDistOnBundle = 1 === Number(process.env.RELDENS_FORCE_RESET_DIST_ON_BUNDLE || 0) || false;
        if(forceResetDistOnBundle){
            await this.resetDist();
        }
        let forceCopyAssetsOnBundle = 1 === Number(process.env.RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE || 0) || false;
        if(forceCopyAssetsOnBundle){
            await this.copyAssetsToDist();
        }
        Logger.info('Running bundle on: '+this.projectIndexPath);
        await this.buildClient();
    }

    async updatePackageJson()
    {
        let jsonFile = FileHandler.joinPaths(this.projectRoot, 'package.json');
        let readFile = jsonFile;
        if(!FileHandler.exists(jsonFile)){
            readFile = FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, 'data-package.json');
        }
        let data = FileHandler.fetchFileJson(readFile);
        if(!data){
            Logger.critical('Invalid package.json data.');
            return;
        }
        if(!data.alias){
            data.alias = {};
        }
        data.alias.process = false;
        await FileHandler.updateFileContents(jsonFile, JSON.stringify(data, null, 2));
    }

}

module.exports.ThemeManager = ThemeManager;
