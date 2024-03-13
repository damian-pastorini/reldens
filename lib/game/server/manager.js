/**
 *
 * Reldens - ServerManager
 *
 */

const dotenv = require('dotenv');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const ReldensASCII = require('../reldens-ascii');
const PackageData = require('./../../../package.json');
const { GameServer } = require('./game-server');
const { AppServerFactory } = require('./app-server-factory');
const { ConfigManager } = require('../../config/server/manager');
const { DataServerInitializer } = require('./data-server-initializer');
const { FeaturesManager } = require('../../features/server/manager');
const { UsersManager } = require('../../users/server/manager');
const { LoginManager } = require('./login-manager');
const { RoomsManager } = require('../../rooms/server/manager');
const { Mailer } = require('./mailer');
const { ThemeManager } = require('./theme-manager');
const { MapsLoader } = require('./maps-loader');
const { ForgotPassword } = require('./forgot-password');
const { Installer } = require('./installer');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

class ServerManager
{

    express = false;
    app = false;
    appServer = {};
    gameServer = false;
    dataServerDriver = false;
    dataServerConfig = {};
    dataServer = false;
    rawConfig = false;
    configManager = {};
    projectRoot = './';
    configServer = false;
    mailer = false;
    featuresManager = false;
    roomsManager = false;
    loginManager = false;
    usersManager = false;
    bundler = false;
    translations = {};

    constructor(config, eventsManager, dataServerDriver)
    {
        this.rawConfig = config;
        this.dataServerDriver = dataServerDriver;
        this.events = eventsManager || EventsManagerSingleton;
        this.themeManager = new ThemeManager(config);
        dotenv.config({debug: process.env.DEBUG, path: this.themeManager.envFilePath});
        this.installer = new Installer({
            themeManager: this.themeManager,
            startCallback: async () => {
                // after installation, we need to reload the environment variables:
                dotenv.config({debug: process.env.DEBUG, path: this.themeManager.envFilePath});
                // and start the server:
                return await this.start();
            }
        });
        this.initializeConfiguration(config);
    }

    setupCustomServerPlugin(config)
    {
        let customPluginClass = sc.get(config, 'customPlugin', false);
        if(!customPluginClass){
            return false;
        }
        this.customPlugin = new customPluginClass();
        this.customPlugin.setup({events: this.events});
    }

    initializeConfiguration(config)
    {
        Logger.info('Initialize Configuration.');
        this.configManager = new ConfigManager({events: this.events, customClasses: (config.customClasses || {})});
        this.projectRoot = sc.get(config, 'projectRoot', './');
        Logger.info('Project root: '+this.projectRoot, 'Module root: '+__dirname);
        this.configServer = this.fetchConfigServerFromEnvironmentVariables();
        this.isHotPlugEnabled = process.env.RELDENS_HOT_PLUG || false;
    }

    fetchConfigServerFromEnvironmentVariables()
    {
        let host = (process.env.RELDENS_APP_HOST || '').toString();
        let port = Number(process.env.PORT || 0);
        if (0 === port){
            port = Number(process.env.RELDENS_APP_PORT || 0);
            if (0 === port){
                port = 8080;
            }
        }
        return {
            host: '' !== host ? host : 'http://localhost',
            port: port,
            monitor: {
                enabled: 1 === Number(process.env.RELDENS_MONITOR || 0) || false,
                auth: Boolean(process.env.RELDENS_MONITOR_AUTH || false),
                user: process.env.RELDENS_MONITOR_USER || '',
                pass: process.env.RELDENS_MONITOR_PASS || '',
            }
        };
    }

    async initializeStorage(config, dataServerDriver)
    {
        Logger.info('Initialize Storage.');
        let {dataServerConfig, dataServer} = DataServerInitializer.initializeEntitiesAndDriver({
            config,
            dataServerDriver,
            serverManager: this
        });
        this.dataServerConfig = dataServerConfig;
        this.dataServer = dataServer;
        if(!await dataServer.connect()){
            Logger.critical('Data Server could not be connected.');
            process.exit();
        }
        await dataServer.generateEntities();
        Logger.info('Storage connected and entities generated.', {
            config: dataServerConfig.config,
            entities: Object.keys(dataServerConfig.loadedEntities)
        });
    }

    async start()
    {
        if(!this.installer.isInstalled()){
            Logger.critical('Reldens not installed.');
            await this.appServer.listen(this.configServer.port);
            Logger.info('Server listening on '+this.configServer.host+':'+this.configServer.port);
            return false;
        }
        Logger.info('Starting Server!');
        if(this.appServer?.listening){
            await this.appServer.close();
            Object.assign(this, AppServerFactory.createAppServer());
        }
        this.setupCustomServerPlugin(this.rawConfig);
        await this.themeManager.validateOrCreateTheme();
        await this.initializeStorage(this.rawConfig, this.dataServerDriver);
        this.configManager.dataServer = this.dataServer;
        MapsLoader.loadMaps(this.themeManager.projectThemePath, this.configManager);
        await this.enableServeStaticsAndHomePage();
        await this.createGameServer();
        if(!this.appServer){
            Logger.critical('App Server is not defined.');
            return false;
        }
        if(!this.gameServer){
            Logger.critical('Game Server is not defined.');
            return false;
        }
        let event = {serverManager: this, continueProcess: true};
        await this.events.emit('reldens.beforeInitializeManagers', event);
        if(!event.continueProcess){
            return false;
        }
        await this.initializeManagers();
        // after the rooms were loaded then finish the server process:
        await this.events.emit('reldens.serverBeforeListen', {serverManager: this});
        await this.gameServer.listen(this.configServer.port);
        this.configManager.configList.server.baseUrl = this.configServer.host+':'+this.configServer.port;
        Logger.log('info', 'Server ready.'+ReldensASCII);
        Logger.info('Main packages:', [
            'parcel: '+PackageData.dependencies['@parcel/core'],
            'colyseus: '+PackageData.dependencies['colyseus'],
            'phaser: '+PackageData.dependencies['phaser'],
            'firebase: '+PackageData.dependencies['firebase'],
            'firebaseui: '+PackageData.dependencies['firebaseui'],
            'reldens/utils: '+PackageData.dependencies['@reldens/utils'],
            'reldens/storage: '+PackageData.dependencies['@reldens/storage'],
            'reldens/modifiers: '+PackageData.dependencies['@reldens/modifiers'],
            'reldens/items-system: '+PackageData.dependencies['@reldens/items-system'],
            'reldens/skills: '+PackageData.dependencies['@reldens/skills'],
        ]);
        Logger.info('Server listening on '+this.configServer.host+':'+this.configServer.port);
        await this.events.emit('reldens.serverReady', {serverManager: this});
    }

    async createServers()
    {
        await this.createAppServer();
        if(!this.installer.isInstalled()){
            Logger.info('Reldens not installed, preparing setup procedure.');
            return await this.installer.prepareSetup(this.app);
        }
        this.enableServeStaticsAndHomePage();
        return true;
    }

    async createAppServer()
    {
        // @TODO - BETA - Pass AppServerFactory to the ServerManager constructor to avoid the other libraries require
        //   if are not needed. Modify theme/index.js.dist to pass it on the default installation.
        let event = {serverManager: this, continueProcess: true};
        await this.events.emit('reldens.createAppServer', event);
        if(!event.continueProcess){
            return false;
        }
        Object.assign(this, AppServerFactory.createAppServer());
    }

    enableServeStaticsAndHomePage()
    {
        // @TODO - BETA - Make these configurable from the storage.
        if(1 === Number(process.env.RELDENS_EXPRESS_SERVE_HOME || 0)){
            AppServerFactory.enableServeHome(this.app, this.themeManager.distPath);
        }
        if(1 === Number(process.env.RELDENS_EXPRESS_SERVE_STATICS || 0)){
            AppServerFactory.enableServeStatics(this.app, this.themeManager.distPath);
        }
    }

    async createGameServer()
    {
        // @TODO - BETA - Extract into a GameServerFactory, pass it to the ServerManager constructor to avoid the other
        //   libraries require if are not needed. Modify theme/index.js.dist to pass it on the default installation.
        let options = {
            pingInterval: process.env.RELDENS_PING_INTERVAL || 5000,
            pingMaxRetries: process.env.RELDENS_PING_MAX_RETRIES || 3
        };
        if(this.appServer){
            options.server = this.appServer;
        }
        let event = {options, continueProcess: true};
        await this.events.emit('reldens.createGameServer', event);
        if(!event.continueProcess){
            return false;
        }
        this.gameServer = new GameServer({
            transport: new WebSocketTransport(options)
        });
        if(this.configServer.monitor.enabled){
            this.gameServer.attachMonitor(this.app, this.configServer.monitor);
        }
    }

    async initializeManagers()
    {
        Logger.info('Initialize Managers.');
        await this.initializeConfigManager();
        await this.initializeMailer();
        await this.initializeFeaturesManager();
        this.initializeUsersManager();
        await this.initializeRoomsManager();
        this.initializeLoginManager();
        await this.defineServerRooms();
    }

    async defineServerRooms()
    {
        await this.events.emit('reldens.serverBeforeDefineRooms', {serverManager: this});
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: this.configManager,
            dataServer: this.dataServer
        });
    }

    initializeLoginManager()
    {
        this.loginManager = new LoginManager({
            config: this.configManager,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager,
            mailer: this.mailer,
            themeManager: this.themeManager,
            events: this.events
        });
    }

    async initializeRoomsManager()
    {
        // the "rooms" manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager({events: this.events, dataServer: this.dataServer});
        await this.events.emit('reldens.serverBeforeLoginManager', {serverManager: this});
    }

    initializeUsersManager()
    {
        this.usersManager = new UsersManager({events: this.events, dataServer: this.dataServer});
    }

    async initializeFeaturesManager()
    {
        this.featuresManager = new FeaturesManager({
            events: this.events,
            dataServer: this.dataServer,
            config: this.configManager
        });
        this.configManager.availableFeaturesList = await this.featuresManager.loadFeatures();
        await this.events.emit('reldens.serverConfigFeaturesReady', {
            serverManager: this,
            configProcessor: this.configManager
        });
    }

    async initializeMailer(mailer)
    {
        // @TODO - BETA - Extract and pass to the ServerManager in the constructor.
        this.mailer = mailer || new Mailer();
        if(this.mailer.readyForSetup){
            let result = await this.mailer.setupTransporter();
            if (!result){
                Logger.error('Mailer setup failed.');
                return false;
            }
        }
        Logger.info('Mailer: '+(this.mailer?.isEnabled() ? 'enabled' : 'disabled'));
        // @TODO - BETA - Check if the forgot password is enabled or not before add the calls to the server.
        await ForgotPassword.defineRequestOnServerManagerApp(this);
    }

    async initializeConfigManager()
    {
        await this.configManager.loadConfigurations();
        this.configManager.projectPaths = this.themeManager.paths();
        await this.events.emit('reldens.serverConfigReady', {serverManager: this, configProcessor: this.configManager});
    }

}

module.exports.ServerManager = ServerManager;
