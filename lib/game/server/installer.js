/**
 *
 * Reldens - Installer
 *
 */

const { EntitiesInstallation } = require('./installer/entities-installation');
const { PrismaInstallation } = require('./installer/prisma-installation');
const { GenericDriverInstallation } = require('./installer/generic-driver-installation');
const { ProjectFilesCreation } = require('./installer/project-files-creation');
const { PackagesInstallation } = require('./installer/packages-installation');
const { TemplateEngine } = require('./template-engine');
const { GameConst } = require('../constants');
const { DriversMap } = require('@reldens/storage');
const { Encryptor, FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class Installer
{

    constructor(props)
    {
        /** @type {ThemeManager} **/
        this.themeManager = sc.get(props, 'themeManager');
        this.startCallback = sc.get(props, 'startCallback');
        this.secretKey = Encryptor.generateSecretKey();
        let projectRoot = sc.get(this.themeManager, 'projectRoot', './');
        let installationType = sc.get(props, 'installationType', 'normal');
        this.prismaInstallation = new PrismaInstallation({
            projectRoot,
            reldensModulePath: sc.get(this.themeManager, 'reldensModulePath', './'),
            subprocessMaxAttempts: sc.get(props, 'subprocessMaxAttempts', 1800),
            prismaClient: sc.get(props, 'prismaClient', false)
        });
        this.entitiesInstallation = new EntitiesInstallation({
            projectRoot,
            prismaInstallation: this.prismaInstallation
        });
        this.genericDriverInstallation = new GenericDriverInstallation();
        this.packagesInstallation = new PackagesInstallation({projectRoot, installationType});
        this.projectFilesCreation = new ProjectFilesCreation({
            themeManager: this.themeManager,
            cleanAssetsCallback: () => this.cleanAssets(),
            startCallback: this.startCallback
        });
    }

    isInstalled()
    {
        if('' === sc.get(this.themeManager, 'installationLockPath', '')){
            return false;
        }
        return FileHandler.exists(this.themeManager.installationLockPath);
    }

    async prepareSetup(app, appServerFactory)
    {
        if(FileHandler.exists(this.themeManager.installerPathIndex)){
            FileHandler.remove(this.themeManager.installerPathIndex, {recursive: true});
        }
        Logger.info('Building installer...');
        await this.themeManager.buildInstaller();
        app.use(appServerFactory.applicationFramework.static(
            this.themeManager.installerPath,
            {
                index: false,
                filter: (req, file) => {
                    return '.html' !== FileHandler.extension(file);
                }
            }
        ));
        // @IMPORTANT: do not use session secret like this in the app (only here in the installer), it is not secure.
        // @NOTE: Include "secure: true" for that case (that only works through SSL).
        // app.use(session({secret: this.secretKey, resave: true, saveUninitialized: true, cookie: {secure: true}}));
        app.use(appServerFactory.session({secret: this.secretKey, resave: true, saveUninitialized: true}));
        app.use(async (req, res, next) => {
            return await this.executeForEveryRequest(next, req, res, appServerFactory.applicationFramework);
        });
        app.post('/install', async (req, res) => {
            return await this.executeInstallProcess(req, res);
        });
    }

    async executeInstallProcess(req, res)
    {
        if(this.isInstalled()){
            return res.redirect('/?redirect=already-installed');
        }
        let templateVariables = req.body;
        templateVariables['app-limit-key-generator'] = '' !== templateVariables['app-trusted-proxy'] ? 1 : 0;
        this.normalizeFilePaths(templateVariables);
        this.setCheckboxesMissingValues(templateVariables);
        this.setSelectedOptions(templateVariables);
        req.session.templateVariables = templateVariables;
        let storageDriverKey = templateVariables['db-storage-driver'];
        if('prisma' === storageDriverKey && -1 !== templateVariables['db-client'].indexOf('mysql')){
            templateVariables['db-client'] = 'mysql';
        }
        if(!storageDriverKey){
            Logger.critical('Missing storage driver in form submission.');
            return res.redirect('/?error=missing-storage-driver');
        }
        let selectedDriver = DriversMap[storageDriverKey];
        if(!selectedDriver){
            Logger.critical('Invalid storage driver: '+storageDriverKey);
            return res.redirect('/?error=invalid-driver');
        }
        let allowPackagesInstallation = '1' === templateVariables['app-allow-packages-installation'];
        if(allowPackagesInstallation){
            await this.packagesInstallation.unlinkAllPackages();
            if(!await this.packagesInstallation.checkAndInstallPackages(storageDriverKey)){
                Logger.critical('Required packages installation failed.');
                return res.redirect('/?error=installation-dependencies-failed');
            }
        }
        let dbConfig = {
            client: templateVariables['db-client'],
            config: {
                host: templateVariables['db-host'],
                port: Number(templateVariables['db-port']),
                database: templateVariables['db-name'],
                user: templateVariables['db-username'],
                password: templateVariables['db-password'],
                multipleStatements: true
            },
            debug: '1' === process?.env?.RELDENS_DEBUG_QUERIES
        };
        // ObjectionJsDriver, MikroOrmDriver, or PrismaDriver:
        let dbDriver = false;
        let migrationsPath = FileHandler.joinPaths(this.themeManager.reldensModulePath, 'migrations', 'production');
        let driverInstallationClass = 'prisma' === storageDriverKey
            ? this.prismaInstallation
            : this.genericDriverInstallation;
        let installationResult = await driverInstallationClass.executeInstallation(
            selectedDriver,
            dbConfig,
            templateVariables,
            migrationsPath
        );
        if(!installationResult.success){
            Logger.critical('Driver installation failed: '+storageDriverKey);
            return res.redirect('/?error='+installationResult.error);
        }
        dbDriver = installationResult.dbDriver;
        if(!dbDriver){
            Logger.critical('Database driver not initialized.');
            return res.redirect('/?error=driver-not-initialized');
        }
        let entitiesGenerated = await this.entitiesInstallation.generateEntities(
            dbDriver,
            true,
            true,
            false,
            dbConfig,
            storageDriverKey
        );
        if(!entitiesGenerated){
            Logger.critical('Entities generation failed.');
            return res.redirect('/?error=entities-generation-failed');
        }
        Logger.info('Entities generated successfully.');
        // @NOTE: do NOT disconnect for Prisma - we need to pass the driver to the callback.
        if('prisma' !== storageDriverKey){
            await dbDriver.disconnect();
        }
        if('' === templateVariables['app-admin-path']){
            templateVariables['app-admin-path'] = '/reldens-admin';
        }
        if('' === templateVariables['app-admin-secret']){
            return res.redirect('/?error=db-installation-process-failed-missing-admin-secret');
        }
        this.setDatabaseUrl(templateVariables);
        let filesCreation = await this.projectFilesCreation.createProjectFiles(
            templateVariables,
            storageDriverKey,
            dbDriver
        );
        if(!filesCreation.success){
            return res.redirect('/?error='+filesCreation.error);
        }
        return res.redirect(templateVariables['app-host']+':'+templateVariables['app-port']);
    }

    setDatabaseUrl(templateVariables)
    {
        let provider = sc.get(templateVariables, 'db-client', 'mysql');
        if(-1 !== provider.indexOf('mysql')){
            provider = 'mysql';
        }
        let user = sc.get(templateVariables, 'db-username', '');
        let password = sc.get(templateVariables, 'db-password', '');
        let host = sc.get(templateVariables, 'db-host', 'localhost');
        let port = sc.get(templateVariables, 'db-port', '3306');
        let database = sc.get(templateVariables, 'db-name', '');
        templateVariables['db-url'] = provider+'://'+user+':'+password+'@'+host+':'+port+'/'+database;
    }

    normalizeFilePaths(templateVariables)
    {
        let pathKeys = ['app-https-key-pem', 'app-https-cert-pem', 'app-https-chain-pem'];
        for(let pathKey of pathKeys){
            if(!sc.hasOwn(templateVariables, pathKey)){
                continue;
            }
            let pathValue = templateVariables[pathKey];
            if(!pathValue || 'string' !== typeof pathValue || '' === pathValue){
                continue;
            }
            templateVariables[pathKey] = pathValue.replace(/\\/g, '/');
        }
    }

    cleanAssets()
    {
        let removeFolders = [
            ['audio'],
            ['custom', 'actions'],
            ['custom', 'groups'],
            ['custom', 'items'],
            ['custom', 'rewards'],
            ['maps']
        ];
        for(let folderPath of removeFolders){
            let assetsFolder = FileHandler.joinPaths(this.themeManager.projectAssetsPath, ...folderPath);
            let assetsFolderDist = FileHandler.joinPaths(this.themeManager.assetsDistPath, ...folderPath);
            FileHandler.remove(assetsFolder);
            FileHandler.remove(assetsFolderDist);
            FileHandler.createFolder(assetsFolder);
            FileHandler.createFolder(assetsFolderDist);
            Logger.debug('Empty folders paths.', assetsFolder, assetsFolderDist, folderPath);
        }
        let spritesPath = FileHandler.joinPaths(this.themeManager.projectAssetsPath, 'custom', 'sprites');
        if(FileHandler.exists(spritesPath)){
            let spritesInAssets = FileHandler.readFolder(spritesPath);
            for(let fileName of spritesInAssets){
                if(GameConst.IMAGE_PLAYER_BASE !== fileName){
                    let fileToRemove = FileHandler.joinPaths(spritesPath, fileName);
                    FileHandler.remove(fileToRemove);
                    Logger.debug('Removed file path', fileToRemove);
                }
            }
        }
        let spritesDistPath = FileHandler.joinPaths(this.themeManager.assetsDistPath, 'custom', 'sprites');
        if(FileHandler.exists(spritesDistPath)){
            let spritesInAssetsDist = FileHandler.readFolder(spritesDistPath);
            for(let fileName of spritesInAssetsDist){
                if(GameConst.IMAGE_PLAYER_BASE !== fileName){
                    let fileToRemove = FileHandler.joinPaths(spritesDistPath, fileName);
                    FileHandler.remove(fileToRemove);
                    Logger.debug('Removed file path', fileToRemove);
                }
            }
        }
        Logger.info('Assets cleaned successfully.');
    }

    async executeForEveryRequest(next, req, res, applicationFramework)
    {
        if(this.isInstalled()){
            return next();
        }
        if('' === req._parsedUrl.pathname || '/' === req._parsedUrl.pathname){
            let installerIndexTemplate = FileHandler.readFile(
                this.themeManager.installerPathIndex,
                {encoding: this.encoding()}
            );
            let templateVariables = req?.session?.templateVariables || this.fetchDefaults();
            return res.send(await TemplateEngine.render(installerIndexTemplate, templateVariables));
        }
        if(!req.url.endsWith('.html')){
            return applicationFramework.static(this.themeManager.installerPath)(req, res, next);
        }
        next();
    }

    fetchDefaults()
    {
        let host = sc.get(process.env, 'RELDENS_HOST', '');
        let port = sc.get(process.env, 'RELDENS_PORT', '');
        let publicUrl = sc.get(process.env, 'RELDENS_PUBLIC_URL', '');
        let trustedProxy = sc.get(process.env, 'RELDENS_EXPRESS_TRUSTED_PROXY', '');
        let adminPath = sc.get(process.env, 'RELDENS_ADMIN_ROUTE_PATH', '');
        let hotPlug = Number(sc.get(process.env, 'RELDENS_HOT_PLUG', 1));
        let dbClient = sc.get(process.env, 'RELDENS_DB_CLIENT', '');
        let dbHost = sc.get(process.env, 'RELDENS_DB_HOST', '');
        let dbPort = sc.get(process.env, 'RELDENS_DB_PORT', '');
        let dbName = sc.get(process.env, 'RELDENS_DB_NAME', '');
        return {
            'app-host': '' !== host ? host : 'http://localhost',
            'app-port': '' !== port ? port : '8080',
            'app-public-url': '' !== publicUrl ? publicUrl : 'http://localhost:8080',
            'app-trusted-proxy': trustedProxy,
            'app-admin-path': '' !== adminPath ? adminPath : '/reldens-admin',
            'app-admin-hot-plug-checked': 1 === hotPlug ? ' checked="checked"' : '',
            'app-allow-packages-installation-checked': ' checked="checked"',
            'db-storage-driver-prisma': ' selected="selected"',
            'db-client': '' !== dbClient ? dbClient : 'mysql2',
            'db-host': '' !== dbHost ? dbHost : 'localhost',
            'db-port': '' !== dbPort ? dbPort : '3306',
            'db-name': '' !== dbName ? dbName : 'reldens',
            'db-basic-config-checked': ' checked="checked"',
            'db-sample-data-checked': ' checked="checked"'
        };
    }

    encoding()
    {
        return sc.get(process.env, 'RELDENS_DEFAULT_ENCODING', 'utf8');
    }

    setCheckboxesMissingValues(templateVariables)
    {
        this.setVariable(templateVariables, 'app-admin-hot-plug');
        this.setVariable(templateVariables, 'app-allow-packages-installation');
        this.setVariable(templateVariables, 'app-use-https');
        this.setVariable(templateVariables, 'app-use-monitor');
        this.setVariable(templateVariables, 'app-secure-monitor');
        this.setVariable(templateVariables, 'app-limit-key-generator');
        this.setVariable(templateVariables, 'db-basic-config');
        this.setVariable(templateVariables, 'db-sample-data');
        this.setVariable(templateVariables, 'mailer-enable');
        this.setVariable(templateVariables, 'mailer-secure');
        this.setVariable(templateVariables, 'firebase-enable');
    }

    setVariable(templateVariables, checkboxId)
    {
        if(!sc.hasOwn(templateVariables, checkboxId)){
            templateVariables[checkboxId] = '0';
            return;
        }
        templateVariables[checkboxId+'-checked'] = ' checked="checked"';
    }

    setSelectedOptions(templateVariables)
    {
        let selectedDriver = sc.get(templateVariables, 'db-storage-driver', 'prisma');
        let selected = ' selected="selected"';
        templateVariables['db-storage-driver-objection-js'] = 'objection-js' === selectedDriver ? selected : '';
        templateVariables['db-storage-driver-mikro-orm'] = 'mikro-orm' === selectedDriver ? selected : '';
        templateVariables['db-storage-driver-prisma'] = 'prisma' === selectedDriver ? selected : '';
        let selectedMailer = templateVariables['mailer-service'];
        templateVariables['mailer-service-sendgrid'] = 'sendgrid' === selectedMailer ? selected : '';
        templateVariables['mailer-service-nodemailer'] = 'nodemailer' === selectedMailer ? selected : '';
    }

}

module.exports.Installer = Installer;
