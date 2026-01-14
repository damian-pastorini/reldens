/**
 *
 * Reldens - Installer
 *
 * Manages the Reldens installation process through a web-based GUI. Orchestrates database setup,
 * entity generation, storage driver configuration (Prisma/ObjectionJS/MikroORM), project file
 * creation (.env, knexfile.js, etc.), and package installation. Provides Express middleware for
 * serving the installation wizard and processing installation form submissions.
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

/**
 * @typedef {import('express').Application} ExpressApplication
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 * @typedef {import('express').NextFunction} ExpressNextFunction
 *
 * @typedef {Object} InstallerProps
 * @property {ThemeManager} themeManager
 * @property {Function} [startCallback]
 * @property {string} [installationType]
 * @property {number} [subprocessMaxAttempts]
 * @property {Object} [prismaClient]
 */
class Installer
{

    /**
     * @param {InstallerProps} props
     */
    constructor(props)
    {
        /** @type {ThemeManager} */
        this.themeManager = sc.get(props, 'themeManager');
        /** @type {Function} */
        this.startCallback = sc.get(props, 'startCallback');
        /** @type {string} */
        this.secretKey = Encryptor.generateSecretKey();
        let projectRoot = sc.get(this.themeManager, 'projectRoot', './');
        let installationType = sc.get(props, 'installationType', 'normal');
        /** @type {PrismaInstallation} */
        this.prismaInstallation = new PrismaInstallation({
            projectRoot,
            reldensModulePath: sc.get(this.themeManager, 'reldensModulePath', './'),
            subprocessMaxAttempts: sc.get(props, 'subprocessMaxAttempts', 1800),
            prismaClient: sc.get(props, 'prismaClient', false)
        });
        /** @type {EntitiesInstallation} */
        this.entitiesInstallation = new EntitiesInstallation({
            projectRoot,
            prismaInstallation: this.prismaInstallation
        });
        /** @type {GenericDriverInstallation} */
        this.genericDriverInstallation = new GenericDriverInstallation();
        /** @type {PackagesInstallation} */
        this.packagesInstallation = new PackagesInstallation({projectRoot, installationType});
        /** @type {ProjectFilesCreation} */
        this.projectFilesCreation = new ProjectFilesCreation({
            themeManager: this.themeManager,
            cleanAssetsCallback: () => this.cleanAssets(),
            startCallback: this.startCallback
        });
        /** @type {string} */
        this.statusFolder = sc.get(this.themeManager, 'installerPath', './dist/install');
        /** @type {string} */
        this.statusFilePath = FileHandler.joinPaths(this.statusFolder, 'install-status.json');
    }

    /**
     * @param {string} message
     */
    updateInstallStatus(message)
    {
        try {
            FileHandler.createFolder(this.statusFolder);
            let statusData = JSON.stringify({message, timestamp: Date.now()});
            FileHandler.writeFile(this.statusFilePath, statusData);
            Logger.info('Installation status: '+message);
        } catch(error) {
            Logger.error('Failed to write installation status: '+error.message);
        }
    }

    clearInstallStatus()
    {
        if(FileHandler.exists(this.statusFilePath)){
            FileHandler.remove(this.statusFilePath);
        }
    }

    /**
     * @returns {boolean}
     */
    isInstalled()
    {
        if('' === sc.get(this.themeManager, 'installationLockPath', '')){
            return false;
        }
        return FileHandler.exists(this.themeManager.installationLockPath);
    }

    /**
     * @param {ExpressApplication} app
     * @param {AppServerFactory} appServerFactory
     * @returns {Promise<void>}
     */
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
        app.get('/install-status.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if(!FileHandler.exists(this.statusFilePath)){
                res.status(404);
                res.write(JSON.stringify({message: 'No status available'}));
                return res.end();
            }
            let statusContent = FileHandler.readFile(this.statusFilePath, {encoding: this.encoding()});
            res.write(statusContent);
            return res.end();
        });
        app.use(async (req, res, next) => {
            return await this.executeForEveryRequest(next, req, res, appServerFactory.applicationFramework);
        });
        app.post('/install', async (req, res) => {
            return await this.executeInstallProcess(req, res);
        });
    }

    /**
     * @param {ExpressRequest} req
     * @param {ExpressResponse} res
     * @returns {Promise<ExpressResponse>} Response redirect to success page or error page
     */
    async executeInstallProcess(req, res)
    {
        if(this.isInstalled()){
            return res.redirect('/?redirect=already-installed');
        }
        this.clearInstallStatus();
        this.updateInstallStatus('Starting installation process...');
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
            this.updateInstallStatus('Checking and installing required packages...');
            this.packagesInstallation.unlinkAllPackages();
            if(!this.packagesInstallation.checkAndInstallPackages(storageDriverKey)){
                Logger.critical('Required packages installation failed.');
                return res.redirect('/?error=installation-dependencies-failed');
            }
        }
        this.updateInstallStatus('Configuring database connection...');
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
        this.updateInstallStatus('Installing database driver: '+storageDriverKey+'...');
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
        this.updateInstallStatus('Generating entities from database schema...');
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
        this.updateInstallStatus('Creating project files...');
        let filesCreation = await this.projectFilesCreation.createProjectFiles(
            templateVariables,
            storageDriverKey,
            dbDriver
        );
        if(!filesCreation.success){
            return res.redirect('/?error='+filesCreation.error);
        }
        this.updateInstallStatus('Installation completed successfully!');
        return res.redirect(templateVariables['app-host']+':'+templateVariables['app-port']);
    }

    /**
     * @param {Object<string, any>} templateVariables
     */
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

    /**
     * @param {Object<string, any>} templateVariables
     */
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

    /**
     * @param {ExpressNextFunction} next
     * @param {ExpressRequest} req
     * @param {ExpressResponse} res
     * @param {ExpressApplication} applicationFramework
     * @returns {Promise<void|ExpressResponse>} Next middleware, response, or void
     */
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

    /**
     * @returns {Object<string, any>} Default template variables from environment or hardcoded defaults
     */
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

    /**
     * @returns {string} Default file encoding from environment (default: 'utf8')
     */
    encoding()
    {
        return sc.get(process.env, 'RELDENS_DEFAULT_ENCODING', 'utf8');
    }

    /**
     * @param {Object<string, any>} templateVariables
     */
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

    /**
     * @param {Object<string, any>} templateVariables
     * @param {string} checkboxId
     */
    setVariable(templateVariables, checkboxId)
    {
        if(!sc.hasOwn(templateVariables, checkboxId)){
            templateVariables[checkboxId] = '0';
            return;
        }
        templateVariables[checkboxId+'-checked'] = ' checked="checked"';
    }

    /**
     * @param {Object<string, any>} templateVariables
     */
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
