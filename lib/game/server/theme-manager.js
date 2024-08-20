/**
 *
 * Reldens - ThemeManager
 *
 */

const { TemplatesList } = require('../../admin/server/templates-list');
const { FileHandler } = require('./file-handler');
const { TemplateEngine } = require('./template-engine');
const { GameConst } = require('../constants');
const { Parcel } = require('@parcel/core');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

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
    reldensModuleThemeAdminPath = '';
    distPath = '';
    assetsDistPath = '';
    cssDistPath = '';
    themePath = '';
    projectThemeName = GameConst.STRUCTURE.DEFAULT;
    projectThemePath = '';
    projectPluginsPath = '';
    projectAdminPath = '';
    projectAssetsPath = '';
    projectCssPath = '';
    projectIndexPath = '';
    projectGenerateDataPath = '';
    projectGeneratedDataPath = '';
    defaultBrowserBundleOptions = {};

    constructor(props)
    {
        if(!sc.hasOwn(props, 'projectRoot')){
            ErrorManager.error('Missing project property.');
        }
        this.encoding = (process.env.RELDENS_DEFAULT_ENCODING || 'utf8');
        this.templateEngine = TemplateEngine;
        this.adminTemplatesList = TemplatesList;
        this.jsSourceMaps = sc.get(props, 'jsSourceMaps', false);
        this.cssSourceMaps = sc.get(props, 'cssSourceMaps', false);
        this.setupPaths(props);
    }

    setupPaths(props)
    {
        let structure = GameConst.STRUCTURE;
        this.projectRoot = sc.get(props, 'projectRoot', '');
        this.projectRootPackageJson = FileHandler.joinPaths(this.projectRoot, 'package.json');
        this.envFilePath = FileHandler.joinPaths(this.projectRoot, '.env');
        this.installationLockPath = FileHandler.joinPaths(this.projectRoot, structure.INSTALL_LOCK);
        this.projectThemeName = sc.get(props, 'projectThemeName', structure.DEFAULT);
        this.projectGenerateDataPath = FileHandler.joinPaths(this.projectRoot, 'generate-data');
        this.projectGeneratedDataPath = FileHandler.joinPaths(this.projectGenerateDataPath, 'generated');
        this.reldensModulePath = FileHandler.joinPaths(this.projectRoot, 'node_modules', 'reldens');
        this.reldensModuleLibPath = FileHandler.joinPaths(this.reldensModulePath, structure.LIB);
        this.reldensModuleThemePath = FileHandler.joinPaths(this.reldensModulePath, structure.THEME);
        this.reldensModuleDefaultThemePath = FileHandler.joinPaths(this.reldensModuleThemePath, structure.DEFAULT);
        this.reldensModuleDefaultThemeAssetsPath = FileHandler.joinPaths(
            this.reldensModuleDefaultThemePath,
            structure.ASSETS
        );
        this.reldensModuleThemePluginsPath = FileHandler.joinPaths(this.reldensModuleThemePath, structure.PLUGINS);
        this.reldensModuleThemeAdminPath = FileHandler.joinPaths(this.reldensModuleThemePath, structure.ADMIN);
        this.reldensModuleInstallerPath = FileHandler.joinPaths(this.reldensModulePath, structure.INSTALLER_FOLDER);
        this.reldensModuleInstallerIndexPath = FileHandler.joinPaths(this.reldensModuleInstallerPath, structure.INDEX);
        this.reldensModulePathInstallTemplatesFolder = FileHandler.joinPaths(
            this.reldensModulePath,
            structure.LIB,
            'game',
            structure.SERVER,
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
        this.installerPath = FileHandler.joinPaths(this.projectRoot, structure.INSTALLER_FOLDER);
        this.installerPathIndex = FileHandler.joinPaths(this.installerPath, structure.INDEX);
        this.themePath = FileHandler.joinPaths(this.projectRoot, structure.THEME);
        this.projectAdminPath = FileHandler.joinPaths(this.themePath, structure.ADMIN);
        this.projectAdminTemplatesPath = FileHandler.joinPaths(this.projectAdminPath, structure.TEMPLATES);
        this.adminTemplates = this.mapTemplatesToPaths(this.adminTemplatesList, this.projectAdminTemplatesPath);
        this.distPath = FileHandler.joinPaths(this.projectRoot, structure.DIST);
        this.assetsDistPath = FileHandler.joinPaths(this.distPath, structure.ASSETS);
        this.cssDistPath = FileHandler.joinPaths(this.distPath, structure.CSS);
        this.projectThemePath = FileHandler.joinPaths(this.themePath, this.projectThemeName);
        this.projectPluginsPath = FileHandler.joinPaths(this.themePath, structure.PLUGINS);
        this.projectAssetsPath = FileHandler.joinPaths(this.projectThemePath, structure.ASSETS);
        this.projectCssPath = FileHandler.joinPaths(this.projectThemePath, structure.CSS);
        this.projectIndexPath = FileHandler.joinPaths(this.projectThemePath, structure.INDEX);
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
        FileHandler.copyFolderSync(this.reldensModuleThemeAdminPath, this.projectAdminPath);
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

    copyKnexFile()
    {
        let knexFile = FileHandler.joinPaths(this.projectRoot, 'knexfile.js');
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, 'knexfile.js.dist'),
            knexFile
        );
        Logger.info('Reminder: edit the knexfile.js file!');
    }

    copyEnvFile()
    {
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, '.env.dist'),
            this.envFilePath
        );
        Logger.info('Reminder: edit the .env file!');
    }

    async copyIndex(override = false)
    {
        let indexFile = FileHandler.joinPaths(this.projectRoot, 'index.js');
        if(FileHandler.exists(indexFile) && !override){
            Logger.info('File already exists: index.js');
            return false;
        }
        let fileContent = FileHandler.fetchFileContents(
            FileHandler.joinPaths(this.reldensModuleThemePath, 'index.js.dist'),
        );
        let parsedIndexContents = await this.templateEngine.render(
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

    copyPackage()
    {
        FileHandler.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath);
        Logger.info(
            'Copied plugins:'+
            '\n'+this.reldensModuleThemePluginsPath+' > '+this.projectPluginsPath
        );
    }

    copyAdmin()
    {
        FileHandler.copyFolderSync(this.reldensModuleThemeAdminPath, this.projectAdminPath);
        Logger.info(
            'Copied admin:'+
            '\n'+this.reldensModuleThemeAdminPath+' > '+this.projectAdminPath
        );
    }

    async buildCss()
    {
        let themeScss = FileHandler.joinPaths(this.projectCssPath, GameConst.STRUCTURE.SCSS_FILE).toString();
        let bundler = this.createCssBundler(themeScss);
        try {
            let { buildTime } = await bundler.run();
            Logger.info('Built Game CSS in '+buildTime+'ms!');
        } catch (error) {
            Logger.critical({'Parcel diagnostics for error': sc.get(error, 'diagnostics', error)});
            ErrorManager.error('Parcel build CSS process failed.');
        }
        FileHandler.createFolder(this.cssDistPath);
        FileHandler.copyFileSyncIfDoesNotExist(
            FileHandler.joinPaths(this.projectCssPath, GameConst.STRUCTURE.CSS_FILE),
            FileHandler.joinPaths(this.cssDistPath, GameConst.STRUCTURE.CSS_FILE)
        );
    }

    async buildAdminScripts()
    {
        let jsSourceFile = FileHandler.joinPaths(this.projectAdminPath, GameConst.STRUCTURE.ADMIN_JS_FILE);
        let bundler = this.createBrowserBundler(jsSourceFile);
        try {
            let { buildTime } = await bundler.run();
            Logger.info('Built Admin JS in '+buildTime+'ms!', jsSourceFile);
        } catch (error) {
            Logger.critical({'Parcel diagnostics for error': sc.get(error, 'diagnostics', error)});
            return false;
        }
        FileHandler.copyFileSyncIfDoesNotExist(
            jsSourceFile,
            FileHandler.joinPaths(this.distPath, GameConst.STRUCTURE.ADMIN_JS_FILE)
        );
    }

    async buildAdminCss()
    {
        let scssSourceFile = FileHandler.joinPaths(this.projectAdminPath, GameConst.STRUCTURE.ADMIN_SCSS_FILE);
        let bundler = this.createCssBundler(scssSourceFile);
        try {
            let { buildTime } = await bundler.run();
            Logger.info('Built Admin CSS in '+buildTime+'ms!', scssSourceFile);
        } catch (error) {
            Logger.critical({'Parcel diagnostics for error': sc.get(error, 'diagnostics', error)});
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
            } catch (error) {
                Logger.critical({'Parcel diagnostics for error': sc.get(error, 'diagnostics', error), elementPath});
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
        } catch (error) {
            Logger.critical('Parcel diagnostics for error on build installer.', sc.get(error, 'diagnostics', error));
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
                sourceMaps: this.jsSourceMaps,
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
                sourceMaps: this.cssSourceMaps,
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
        this.copyAdmin();
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
        return await this.templateEngine.render(fileContent, params);
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
        Logger.info('Updating package.json.', jsonFile);
        let readFile = jsonFile;
        if(!FileHandler.exists(jsonFile)){
            readFile = FileHandler.joinPaths(this.reldensModulePathInstallTemplatesFolder, 'data-package.json');
            Logger.error('File package.json does not exists, changing read-file.', jsonFile);
        }
        let data = FileHandler.fetchFileJson(readFile);
        if(!data){
            Logger.critical('Invalid package.json data.', readFile);
            return;
        }
        if(!data.alias){
            data.alias = {};
        }
        if(data.alias.process){
            Logger.critical('Data alias process already exists, it must be set to "false" for the bundler.', data);
            data.alias.processBackup = data.alias.process;
        }
        data.alias.process = false;
        if(!data.targets){
            data.targets = {};
        }
        if(data.targets.main){
            Logger.critical('Data targets main already exists, it must be set to "false" for the bundler.', data);
            data.targets.mainBackup = data.targets.main;
        }
        data.targets.main = false;
        await FileHandler.updateFileContents(jsonFile, JSON.stringify(data, null, 2));
        Logger.info('File package.json updated successfully.', jsonFile);

    }

    mapTemplatesToPaths(templateList, path)
    {
        let result = {};
        for(let templateName of Object.keys(templateList)){
            if(sc.isObject(templateList[templateName])){
                result[templateName] = this.mapTemplatesToPaths(
                    templateList[templateName],
                    FileHandler.joinPaths(path, templateName)
                );
                continue;
            }
            result[templateName] = FileHandler.joinPaths(path, templateList[templateName]);
        }
        return result;
    }

}

module.exports.ThemeManager = ThemeManager;
