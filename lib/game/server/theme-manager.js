/**
 *
 * Reldens - ThemeManager
 *
 */

const fs = require('fs');
const path = require('path');
const TemplateEngine = require('mustache');
const { Parcel } = require('@parcel/core');
const { ErrorManager, Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../constants');

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
        this.projectRootPackageJson = path.join(this.projectRoot, 'package.json');
        this.envFilePath = path.join(this.projectRoot, '.env');
        this.installationLockPath = path.join(this.projectRoot, 'install.lock');
        this.projectThemeName = sc.get(props, 'projectThemeName', GameConst.STRUCTURE.DEFAULT);
        this.reldensModulePath = path.join(this.projectRoot, 'node_modules', 'reldens');
        this.reldensModuleLibPath = path.join(this.reldensModulePath, GameConst.STRUCTURE.LIB);
        this.reldensModuleThemePath = path.join(this.reldensModulePath, GameConst.STRUCTURE.THEME);
        this.reldensModuleDefaultThemePath = path.join(this.reldensModuleThemePath, GameConst.STRUCTURE.DEFAULT);
        this.reldensModuleDefaultThemeAssetsPath = path.join(
            this.reldensModuleDefaultThemePath,
            GameConst.STRUCTURE.ASSETS
        );
        this.reldensModuleThemePluginsPath = path.join(this.reldensModuleThemePath, GameConst.STRUCTURE.PLUGINS);
        this.reldensModuleInstallerPath = path.join(this.reldensModulePath, GameConst.STRUCTURE.INSTALLER_FOLDER);
        this.reldensModuleInstallerIndexPath = path.join(
            this.reldensModuleInstallerPath,
            GameConst.STRUCTURE.INSTALLER_INDEX
        );
        this.reldensModulePathInstallTemplatesFolder = path.join(
            this.reldensModulePath,
            'lib',
            'game',
            'server',
            'install-templates'
        );
        this.reldensModulePathInstallTemplateEnvDist = path.join(
            this.reldensModulePathInstallTemplatesFolder,
            '.env.dist'
        );
        this.reldensModulePathInstallTemplateKnexDist = path.join(
            this.reldensModulePathInstallTemplatesFolder,
            'knexfile.js.dist'
        );
        this.installerPath = path.join(this.projectRoot, GameConst.STRUCTURE.INSTALLER_FOLDER);
        this.installerPathIndex = path.join(this.installerPath, GameConst.STRUCTURE.INSTALLER_INDEX);
        this.distPath = path.join(this.projectRoot, GameConst.STRUCTURE.DIST);
        this.assetsDistPath = path.join(this.distPath, GameConst.STRUCTURE.ASSETS);
        this.cssDistPath = path.join(this.distPath, GameConst.STRUCTURE.CSS);
        this.themePath = path.join(this.projectRoot, GameConst.STRUCTURE.THEME);
        this.projectThemePath = path.join(this.themePath, this.projectThemeName);
        this.projectPluginsPath = path.join(this.themePath, GameConst.STRUCTURE.PLUGINS);
        this.projectAssetsPath = path.join(this.projectThemePath, GameConst.STRUCTURE.ASSETS);
        this.projectCssPath = path.join(this.projectThemePath, GameConst.STRUCTURE.CSS);
        this.projectIndexPath = path.join(this.projectThemePath, GameConst.STRUCTURE.INDEX);
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
        return path.join(this.projectAssetsPath, ...args);
    }

    permissionsCheck()
    {
        try {
            let crudTestPath = path.join(this.projectRoot, 'crud-test');
            fs.mkdirSync(crudTestPath, {recursive: true});
            fs.rmSync(crudTestPath);
            return true;
        } catch (error) {
            return false;
        }
    }

    resetDist()
    {
        this.removeDist();
        fs.mkdirSync(this.distPath, {recursive: true});
        fs.mkdirSync(this.assetsDistPath, {recursive: true});
        fs.mkdirSync(this.cssDistPath, {recursive: true});
        Logger.info('Reset "dist" folder, created: '+this.distPath);
    }

    removeDist()
    {
        if(fs.existsSync(this.distPath)){
            fs.rmSync(this.distPath, {recursive: true});
        }
    }

    installDefaultTheme()
    {
        this.copyFolderSync(this.reldensModuleDefaultThemePath, this.projectThemePath);
        this.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath);
        this.copyFolderSync(this.reldensModuleDefaultThemePath, this.distPath);
        Logger.info('Install "default" theme:'
            +'\n'+this.reldensModuleDefaultThemePath+' > '+this.projectThemePath
            +'\n'+this.reldensModuleThemePluginsPath+' > '+this.projectPluginsPath
            +'\n'+this.reldensModuleDefaultThemePath+' > '+this.distPath
        );
    }

    copyAssetsToDist()
    {
        this.copyFolderSync(this.projectAssetsPath, this.assetsDistPath);
        Logger.info(
            'Copied "assets" to "dist" from:'
            +'\n'+this.projectAssetsPath+' > '+this.assetsDistPath
        );
    }

    copyFolderSync(from, to)
    {
        fs.mkdirSync(to, {recursive: true});
        fs.readdirSync(from).forEach(element => {
            if(fs.lstatSync(path.join(from, element)).isFile()){
                fs.copyFileSync(path.join(from, element), path.join(to, element));
                return;
            }
            this.copyFolderSync(path.join(from, element), path.join(to, element));
        });
    }

    copyKnexFile()
    {
        let knexFile = path.join(this.projectRoot, 'knexfile.js');
        if(fs.existsSync(knexFile)){
            Logger.info('File already exists: knexfile.js');
            return false;
        }
        fs.copyFileSync(path.join(this.reldensModulePathInstallTemplatesFolder, 'knexfile.js.dist'), knexFile);
        Logger.info('Reminder: edit the knexfile.js file!');
    }

    copyEnvFile()
    {
        if(fs.existsSync(this.envFilePath)){
            Logger.info('File already exists: .env');
            return false;
        }
        fs.copyFileSync(path.join(this.reldensModulePathInstallTemplatesFolder, '.env.dist'), this.envFilePath);
        Logger.info('Reminder: edit the .env file!');
    }

    async copyIndex(override = false)
    {
        let indexFile = path.join(this.projectRoot, 'index.js');
        if(fs.existsSync(indexFile) && !override){
            Logger.info('File already exists: index.js');
            return false;
        }
        let fileContent = fs.readFileSync(
            path.join(this.reldensModuleThemePath, 'index.js.dist'),
            {encoding: this.encoding, flag:'r'}
        );
        let parsedIndexContents = await TemplateEngine.render(
            fileContent,
            {yourThemeName: this.projectThemeName ?? 'default'}
        );
        try {
            let fd = fs.openSync(indexFile, 'w+');
            await fs.writeFileSync(fd, parsedIndexContents.toString());
        } catch (error) {
            Logger.error('Failed to create index.js file.', error);
        }
    }

    copyDefaultAssets()
    {
        this.copyFolderSync(this.reldensModuleDefaultThemeAssetsPath, this.assetsDistPath);
        Logger.info(
            'Copied default assets:'+
            '\n'+this.reldensModuleDefaultThemeAssetsPath+' > '+this.assetsDistPath
        );
    }

    copyDefaultTheme()
    {
        this.copyFolderSync(this.reldensModuleDefaultThemePath, this.projectThemePath);
        Logger.info(
            'Copied default theme:'+
            '\n'+this.reldensModuleDefaultThemePath+' > '+this.projectThemePath
        );
    }

    copyCustomAssets()
    {
        this.copyFolderSync(this.projectAssetsPath, this.assetsDistPath);
        Logger.info(
            'Copied custom assets:'+
            '\n'+this.projectAssetsPath+' > '+this.assetsDistPath
        );
    }

    copyPackage()
    {
        this.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath);
        Logger.info(
            'Copied plugins:'+
            '\n'+this.reldensModuleThemePluginsPath+' > '+this.projectPluginsPath
        );
    }

    async buildCss()
    {
        let themeScss = path.join(this.projectCssPath, GameConst.STRUCTURE.SCSS_FILE).toString();
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
        let adminScss = path.join(this.projectCssPath, GameConst.STRUCTURE.ADMIN_SCSS_FILE);
        let bundler = this.createCssBundler(adminScss);
        try {
            let { buildTime } = await bundler.run();
            Logger.info('Built Admin CSS in '+buildTime+'ms!');
        } catch (err) {
            Logger.critical({'Parcel diagnostics for error': sc.get(err, 'diagnostics', err)});
            return false;
        }
        let adminCss = path.join(this.projectCssPath, GameConst.STRUCTURE.ADMIN_CSS_FILE);
        let adminCssDist = path.join(this.cssDistPath, GameConst.STRUCTURE.ADMIN_CSS_FILE);
        if(!fs.existsSync(this.cssDistPath)){
            fs.mkdirSync(this.cssDistPath);
        }
        if(!fs.existsSync(adminCssDist)){
            fs.copyFileSync(adminCss, adminCssDist);
        }
    }

    async buildSkeleton()
    {
        await this.buildCss();
        await this.buildClient();
        Logger.info('Built Skeleton.');
    }

    async buildClient()
    {
        let elementsCollection = fs.readdirSync(this.projectThemePath);
        for(let element of elementsCollection){
            if(-1 === element.indexOf('.html')){
                continue;
            }
            let elementPath = path.join(this.projectThemePath, element);
            if(!fs.lstatSync(elementPath).isFile()){
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
        let parcelCache = path.join(folderPath, '.parcel-cache');
        if(fs.existsSync(parcelCache)){
            await fs.rmSync(parcelCache, {recursive: true, force: true});
        }
    }

    async buildInstaller()
    {
        try {
            let bundleOptions = this.generateDefaultBrowserBundleOptions(this.reldensModuleInstallerIndexPath);
            if(!fs.existsSync(this.installerPath)){
                Logger.info('Installer path not exists, creating: '+this.installerPath);
                fs.mkdirSync(this.installerPath);
            }
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
        let result = fs.existsSync(this.distPath);
        Logger.info('Dist path: '+this.distPath, 'Dist folder exists? '+(result ? 'yes' : 'no'));
        return result;
    }

    themePathExists()
    {
        let result = fs.existsSync(this.projectThemePath);
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
        if(!fs.existsSync(filePath)){
            Logger.error('Template not found.', {filePath});
            return false;
        }
        let fileContent = fs.readFileSync(filePath, {encoding: this.encoding, flag:'r'});
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
        let jsonFile = path.join(this.projectRoot, 'package.json');
        let readOptions = {encoding: this.encoding, flag:'r'};
        let fileContent = fs.existsSync(jsonFile)
            ? fs.readFileSync(jsonFile, readOptions)
            : fs.readFileSync(
                path.join(this.reldensModulePathInstallTemplatesFolder, 'data-package.json'),
                readOptions
            );
        let data = sc.parseJson(fileContent);
        if(!data){
            Logger.critical('Invalid package.json data.');
            return;
        }
        if(!data.alias){
            data.alias = {};
        }
        data.alias.process = false;
        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), {encoding: this.encoding, flag:'w'});
    }

}

module.exports.ThemeManager = ThemeManager;
