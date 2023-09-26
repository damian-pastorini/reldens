/**
 *
 * Reldens - ServerManager
 *
 */

const dotenv = require('dotenv');
const path = require('path');
const ReldensASCII = require('../reldens-ascii');
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
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');
const { WebSocketTransport } = require('@colyseus/ws-transport');

class ServerManager
{

    express = false;
    app = false;
    appServer = {};
    gameServer = false;
    dataServerConfig = {};
    dataServer = false;
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
        this.events = eventsManager || EventsManagerSingleton;
        try {
            // @NOTE: custom plugin goes even before config to catch up on every single event.
            this.setupCustomServerPlugin(config);
            this.initializeConfiguration(config);
            this.themeManager = new ThemeManager(config);
            this.themeManager.validateOrCreateTheme();
            this.initializeStorage(config, dataServerDriver).catch((error) => {
                Logger.critical('Storage could not be initialized.', error);
                process.exit();
            });
            this.configManager.dataServer = this.dataServer;
            MapsLoader.loadMaps(this.themeManager.projectThemePath, this.configManager);
        } catch (e) {
            Logger.error('Broken ServerManager.', e.message, e.stack);
            // @TODO - BETA - Improve error handler to not kill the process or automatically restart it.
            process.exit();
        }
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
        // configuration data from database:
        this.configManager = new ConfigManager({events: this.events, customClasses: (config.customClasses || {})});
        this.projectRoot = sc.get(config, 'projectRoot', './');
        Logger.info('Project root: '+this.projectRoot, 'Module root: '+__dirname);
        let envPath = path.join(this.projectRoot, '.env');
        dotenv.config({debug: process.env.DEBUG, path: envPath});
        this.configServer = {
            port: Number(process.env.PORT) || Number(process.env.RELDENS_APP_PORT) || 8080,
            host: process.env.RELDENS_APP_HOST || 'http://localhost',
            monitor: {
                enabled: process.env.RELDENS_MONITOR || false,
                auth: process.env.RELDENS_MONITOR_AUTH || false,
                user: process.env.RELDENS_MONITOR_USER,
                pass: process.env.RELDENS_MONITOR_PASS,
            }
        };
        this.isHotPlugEnabled = process.env.RELDENS_HOT_PLUG || false;
    }

    async initializeStorage(config, dataServerDriver)
    {
        let {dataServerConfig, dataServer} = DataServerInitializer.initializeEntitiesAndDriver({
            config,
            dataServerDriver,
            serverManager: this
        });
        this.dataServerConfig = dataServerConfig;
        this.dataServer = dataServer;
        await dataServer.connect(); // can't auto-connect on the constructor
        await dataServer.generateEntities();
    }

    async start()
    {
        Logger.info('Starting Server!');
        if(!this.appServer){
            Logger.critical('App Server is not defined.');
            return false;
        }
        if(!this.gameServer){
            Logger.critical('Game Server is not defined.');
            return false;
        }
        await this.initializeManagers();
        await this.events.emit('reldens.serverBeforeListen', {serverManager: this});
        await this.gameServer.listen(this.configServer.port);
        this.configManager.configList.server.baseUrl = this.configServer.host+':'+this.configServer.port;
        Logger.info('Server ready.'+ReldensASCII);
        Logger.info('Server listening on '+this.configServer.host+':'+this.configServer.port);
        await this.events.emit('reldens.serverReady', {serverManager: this});
    }

    async createServers()
    {
        await this.createAppServer();
        this.enableServeStaticsAndHomePage();
        await this.createGameServer();
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
        if(process.env.RELDENS_EXPRESS_SERVE_HOME){
            AppServerFactory.enableServeHome(this.app, this.themeManager.distPath);
        }
        if(process.env.RELDENS_EXPRESS_SERVE_STATICS){
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
        await this.initializeConfigManager();
        await this.initializeMailer();
        await this.initializeFeaturesManager();
        await this.initializeUsersAndLoginManager();
        await this.initializeRoomsManager();
    }

    async initializeRoomsManager() {
        // the "rooms" manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager({events: this.events, dataServer: this.dataServer});
        await this.events.emit('reldens.serverBeforeDefineRooms', {serverManager: this});
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: this.configManager,
            dataServer: this.dataServer
        });
    }

    async initializeUsersAndLoginManager()
    {
        this.usersManager = new UsersManager({events: this.events, dataServer: this.dataServer});
        await this.events.emit('reldens.serverBeforeLoginManager', {serverManager: this});
        this.loginManager = new LoginManager({
            config: this.configManager,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager,
            mailer: this.mailer,
            themeManager: this.themeManager,
            events: this.events
        });
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

    async initializeMailer()
    {
        // @TODO - BETA - Extract and pass to the ServerManager in the constructor.
        this.mailer = new Mailer();
        Logger.info(['Mailer Configured:', this.mailer.isEnabled()]);
        await ForgotPassword.defineRequestOnServerManagerApp(this);
    }

    async initializeConfigManager()
    {
        await this.configManager.loadConfigurations();
        this.configManager.projectPaths = this.themeManager.paths();
        await this.events.emit('reldens.serverConfigReady', {
            serverManager: this,
            configProcessor: this.configManager
        });
    }

}

module.exports.ServerManager = ServerManager;
