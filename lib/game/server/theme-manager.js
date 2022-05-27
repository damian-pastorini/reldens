/**
 *
 * Reldens - ThemeManager
 *
 * This class will search for the project root required folders and give developers the option of create them.
 *
 */

const { Parcel } = require('@parcel/core');
const fs = require('fs');
const path = require('path');
const TemplateEngine = require('mustache');
const { Logger, sc, ErrorManager} = require('@reldens/utils');
const { GameConst } = require('../constants');

class ThemeManager
{

    projectRoot = '';
    reldensModulePath = '';
    reldensModuleLibPath = '';
    reldensModuleThemePath = '';
    reldensModuleDefaultThemePath = '';
    reldensModuleDefaultThemeAssetsPath = '';
    reldensModuleThemePluginsPath = '';
    distPath = '';
    assetsDistPath = '';
    cssDistPath = '';
    themePath = '';
    projectThemeName = GameConst.THEMES.DEFAULT;
    projectThemePath = '';
    projectPluginsPath = '';
    projectAssetsPath = '';
    projectCssPath = '';
    projectIndexPath = '';

    constructor(props)
    {
        if(!sc.hasOwn(props, 'projectRoot')){
            ErrorManager.error('Missing project property.');
        }
        this.setupPaths(props);
    }

    setupPaths(props)
    {
        this.projectRoot = props.projectRoot;
        this.projectRootPackageJson = path.join(this.projectRoot, 'package.json');
        this.projectThemeName = sc.get(props, 'projectThemeName', GameConst.THEMES.DEFAULT);
        this.reldensModulePath = path.join(this.projectRoot, 'node_modules', 'reldens');
        this.reldensModuleLibPath = path.join(this.reldensModulePath, GameConst.THEMES.LIB);
        this.reldensModuleThemePath = path.join(this.reldensModulePath, GameConst.THEMES.THEME);
        this.reldensModuleDefaultThemePath = path.join(this.reldensModuleThemePath, GameConst.THEMES.DEFAULT);
        this.reldensModuleDefaultThemeAssetsPath = path.join(this.reldensModuleDefaultThemePath, GameConst.THEMES.ASSETS);
        this.reldensModuleThemePluginsPath = path.join(this.reldensModuleThemePath, GameConst.THEMES.PLUGINS);
        this.distPath = path.join(this.projectRoot, GameConst.THEMES.DIST);
        this.assetsDistPath = path.join(this.distPath, GameConst.THEMES.ASSETS);
        this.cssDistPath = path.join(this.distPath, GameConst.THEMES.CSS);
        this.themePath = path.join(this.projectRoot, GameConst.THEMES.THEME);
        this.projectThemePath = path.join(this.themePath, this.projectThemeName);
        this.projectPluginsPath = path.join(this.themePath, GameConst.THEMES.PLUGINS);
        this.projectAssetsPath = path.join(this.projectThemePath, GameConst.THEMES.ASSETS);
        this.projectCssPath = path.join(this.projectThemePath, GameConst.THEMES.CSS);
        this.projectIndexPath = path.join(this.projectThemePath, GameConst.THEMES.INDEX);
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
        Logger.info({'Reset "dist" folder, created:': [this.distPath, this.assetsDistPath, this.cssDistPath]});
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
        Logger.info({'Install "default" theme:': [
                [this.reldensModuleDefaultThemePath, this.projectThemePath],
                [this.reldensModuleThemePluginsPath, this.projectPluginsPath],
                [this.reldensModuleDefaultThemePath, this.distPath]
            ]});
    }

    copyAssetsToDist()
    {
        this.copyFolderSync(this.projectAssetsPath, this.assetsDistPath);
        Logger.info({'Copied "assets" to "dist":': [this.projectAssetsPath, this.assetsDistPath]});
    }

    copyFolderSync(from, to)
    {
        fs.mkdirSync(to, {recursive: true});
        fs.readdirSync(from).forEach(element => {
            if(fs.lstatSync(path.join(from, element)).isFile()){
                fs.copyFileSync(path.join(from, element), path.join(to, element));
            } else {
                this.copyFolderSync(path.join(from, element), path.join(to, element));
            }
        });
    }

    copyKnexFile()
    {
        let knexFile = path.join(this.projectRoot, 'knexfile.js');
        if(fs.existsSync(knexFile)){
            Logger.info('File already exists: knexfile.js');
            return false;
        }
        fs.copyFileSync(path.join(this.reldensModulePath, 'knexfile.js.dist'), knexFile);
        Logger.info('Reminder: edit the knexfile.js file!');
    }

    copyEnvFile()
    {
        let envFile = path.join(this.projectRoot, '.env');
        if(fs.existsSync(envFile)){
            Logger.info('File already exists: .env');
            return false;
        }
        fs.copyFileSync(path.join(this.reldensModulePath, '.env.dist'), envFile);
        Logger.info('Reminder: edit the .env file!');
    }

    copyIndex(override = false)
    {
        let indexFile = path.join(this.projectRoot, 'index.js');
        if(fs.existsSync(indexFile) && !override){
            Logger.info('File already exists: index.js');
            return false;
        }
        fs.copyFileSync(path.join(this.reldensModuleThemePath, 'index.js.dist'), indexFile);
    }

    copyDefaultAssets()
    {
        this.copyFolderSync(this.reldensModuleDefaultThemeAssetsPath, this.assetsDistPath);
        Logger.info({'Copied default assets:': [this.reldensModuleDefaultThemeAssetsPath, this.assetsDistPath]});
    }

    copyDefaultTheme()
    {
        this.copyFolderSync(this.reldensModuleDefaultThemePath, this.projectThemePath);
        Logger.info({'Copied default theme:': [this.reldensModuleDefaultThemePath, this.projectThemePath]});
    }

    copyCustomAssets()
    {
        this.copyFolderSync(this.projectAssetsPath, this.assetsDistPath);
        Logger.info({'Copied custom assets:': [this.projectAssetsPath, this.assetsDistPath]});
    }

    copyPackage()
    {
        this.copyFolderSync(this.reldensModuleThemePluginsPath, this.projectPluginsPath);
        Logger.info({'Copied plugins:': [this.reldensModuleThemePluginsPath, this.projectPluginsPath]});
    }

    async buildCss()
    {
        let themeScss = path.join(this.projectCssPath, GameConst.THEMES.SCSS_FILE).toString();
        let bundler = this.createCssBundler(themeScss);
        await bundler.run();
    }

    async buildAdminCss()
    {
        let adminCss = path.join(this.projectCssPath, GameConst.THEMES.ADMIN_CSS_FILE);
        if(!fs.existsSync(adminCss)){
            let adminScss = path.join(this.projectCssPath, GameConst.THEMES.ADMIN_SCSS_FILE);
            let bundler = this.createCssBundler(adminScss);
            await bundler.run();
        }
        let adminCssDist = path.join(this.cssDistPath, GameConst.THEMES.ADMIN_CSS_FILE);
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
        let bundler = this.createBrowserBundler(this.projectIndexPath);
        try {
            let {bundleGraph, buildTime} = await bundler.run();
            let bundles = bundleGraph.getBundles();
            Logger.info(`✨ Built ${bundles.length} bundles in ${buildTime}ms!`);
        } catch (err) {
            Logger.error(sc.get(err, 'diagnostics', err));
        }
    }

    createBrowserBundler(entryPath)
    {
        return new Parcel({
            defaultConfig: '@parcel/config-default',
            targets: ['browser'],
            entries: entryPath,
            logLevel: 'verbose',
            defaultTargetOptions: {
                shouldOptimize: true,
                sourceMaps: false,
                distDir: this.distPath,
                isLibrary: true,
                outputFormat: 'esmodule'
            }
        });
    }

    createCssBundler(entryPath)
    {
        return new Parcel({
            defaultConfig: '@parcel/config-default',
            targets: ['browser'],
            entries: entryPath,
            defaultTargetOptions: {
                shouldOptimize: true,
                sourceMaps: false,
                distDir: this.projectCssPath,
                isLibrary: true,
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
        this.copyIndex(true);
        this.copyServerFiles();
        this.resetDist();
        await this.fullRebuild();
    }

    copyServerFiles()
    {
        this.copyEnvFile();
        this.copyKnexFile();
        this.copyIndex();
    }

    distPathExists()
    {
        let result = fs.existsSync(this.distPath);
        Logger.info({'Dist path:': this.distPath, 'Dist folder exists?': result});
        return result;
    }

    themePathExists()
    {
        let result = fs.existsSync(this.projectThemePath);
        Logger.info({'Theme path:': this.projectThemePath, 'Theme folder exists?': result});
        return result;
    }

    validateOrCreateTheme()
    {
        let distExists = this.distPathExists();
        let themeExists = this.themePathExists();
        if(false === themeExists){
            this.installDefaultTheme();
            Logger.error('Project theme folder was not found: '+this.projectThemeName
                +'\nA copy from default has been made.');
        }
        if(false === distExists){
            this.copyAssetsToDist();
        }
    }

    async loadAndRenderTemplate(filePath, params)
    {
        if(!fs.existsSync(filePath)){
            Logger.error(['Template not found.', filePath]);
            return false;
        }
        let fileContent = fs.readFileSync(filePath, {encoding:'utf8', flag:'r'});
        return TemplateEngine.render(fileContent, params);
    }

}

module.exports.ThemeManager = ThemeManager;
