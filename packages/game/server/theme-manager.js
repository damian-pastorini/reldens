/**
 *
 * Reldens - ThemeManager
 *
 * This class will search for the project root required folders and give developers the option of create them.
 *
 */

const { BundlerDriverParcelMiddleware } = require('./bundler-driver-parcel-middleware');
const fs = require('fs');
const path = require('path');
const TemplateEngine = require('mustache');
const { Logger, sc, ErrorManager} = require('@reldens/utils');
const { GameConst } = require('../constants');

class ThemeManager
{

    projectRoot = '';
    reldensModulePath = '';
    reldensModulePackagesPath = '';
    reldensModuleThemePath = '';
    reldensModuleDefaultThemePath = '';
    reldensModuleDefaultThemeAssetsPath = '';
    reldensModuleThemePackagesPath = '';
    distPath = '';
    assetsDistPath = '';
    cssDistPath = '';
    themePath = '';
    projectThemeName = GameConst.THEMES.DEFAULT;
    projectThemePath = '';
    projectPackagesPath = '';
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
        this.projectThemeName = sc.get(props, 'projectThemeName', GameConst.THEMES.DEFAULT);
        this.reldensModulePath = path.join(this.projectRoot, 'node_modules', 'reldens');
        this.reldensModulePackagesPath = path.join(this.reldensModulePath, GameConst.THEMES.PACKAGES);
        this.reldensModuleThemePath = path.join(this.reldensModulePath, GameConst.THEMES.THEME);
        this.reldensModuleDefaultThemePath = path.join(this.reldensModuleThemePath, GameConst.THEMES.DEFAULT);
        this.reldensModuleDefaultThemeAssetsPath = path.join(this.reldensModuleDefaultThemePath, GameConst.THEMES.ASSETS);
        this.reldensModuleThemePackagesPath = path.join(this.reldensModuleThemePath, GameConst.THEMES.PACKAGES);
        this.distPath = path.join(this.projectRoot, GameConst.THEMES.DIST);
        this.assetsDistPath = path.join(this.distPath, GameConst.THEMES.ASSETS);
        this.cssDistPath = path.join(this.distPath, GameConst.THEMES.CSS)
        this.themePath = path.join(this.projectRoot, GameConst.THEMES.THEME);
        this.projectThemePath = path.join(this.themePath, this.projectThemeName);
        this.projectPackagesPath = path.join(this.themePath, GameConst.THEMES.PACKAGES);
        this.projectAssetsPath = path.join(this.projectThemePath, GameConst.THEMES.ASSETS);
        this.projectCssPath = path.join(this.projectThemePath, GameConst.THEMES.CSS);
        this.projectIndexPath = path.join(this.projectThemePath, GameConst.THEMES.INDEX);
    }

    paths()
    {
        return {
            projectRoot: this.projectRoot,
            reldensModulePath: this.reldensModulePath,
            reldensModulePackagesPath: this.reldensModulePackagesPath,
            reldensModuleThemePath: this.reldensModuleThemePath,
            reldensModuleDefaultThemePath: this.reldensModuleDefaultThemePath,
            reldensModuleDefaultThemeAssetsPath: this.reldensModuleDefaultThemeAssetsPath,
            reldensModuleThemePackagesPath: this.reldensModuleThemePackagesPath,
            distPath: this.distPath,
            assetsDistPath: this.assetsDistPath,
            themePath: this.themePath,
            projectThemePath: this.projectThemePath,
            projectPackagesPath: this.projectPackagesPath,
            projectAssetsPath: this.projectAssetsPath,
            projectIndexPath: this.projectIndexPath
        };
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
        this.copyFolderSync(this.reldensModuleThemePackagesPath, this.projectPackagesPath);
        this.copyFolderSync(this.reldensModuleDefaultThemePath, this.distPath);
        Logger.info({'Install "default" theme:': [
                [this.reldensModuleDefaultThemePath, this.projectThemePath],
                [this.reldensModuleThemePackagesPath, this.projectPackagesPath],
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

    copyIndex()
    {
        let indexFile = path.join(this.projectRoot, 'index.js');
        if(fs.existsSync(indexFile)){
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
        this.copyFolderSync(this.reldensModuleThemePackagesPath, this.projectPackagesPath);
        Logger.info({'Copied packages:': [this.reldensModuleThemePackagesPath, this.projectPackagesPath]});
    }

    async buildCss()
    {
        let buildData = {
            production: process.env.NODE_ENV === 'production',
            sourceMaps: false,
            publicUrl: './',
            outDir: this.projectCssPath
        };
        let bundler = new BundlerDriverParcelMiddleware(
            path.join(this.projectCssPath, GameConst.THEMES.SCSS_FILE),
            buildData
        );
        await bundler.bundle();
    }

    async buildAdminCss()
    {
        let adminCss = path.join(this.projectCssPath, GameConst.THEMES.ADMIN_CSS_FILE);
        if(!fs.existsSync(adminCss)){
            let buildData = {
                production: process.env.NODE_ENV === 'production',
                sourceMaps: false,
                publicUrl: './',
                outDir: this.projectCssPath
            };
            let bundler = new BundlerDriverParcelMiddleware(
                path.join(this.projectCssPath, GameConst.THEMES.ADMIN_SCSS_FILE),
                buildData
            );
            await bundler.bundle();
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
        let buildData = {
            production: process.env.NODE_ENV === 'production',
            sourceMaps: false,
            outDir: path.join(this.distPath)
        };
        let bundler = new BundlerDriverParcelMiddleware(
            path.join(this.projectThemePath, GameConst.THEMES.INDEX),
            buildData
        );
        await bundler.bundle();
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
        let fullPath = path.join(this.projectThemePath, filePath);
        if(!fs.existsSync(fullPath)){
            Logger.error(['Template not found.', fullPath]);
            return false;
        }
        let fileContent = fs.readFileSync(fullPath, {encoding:'utf8', flag:'r'});
        return TemplateEngine.render(fileContent, params);
    }

}

module.exports.ThemeManager = ThemeManager;
