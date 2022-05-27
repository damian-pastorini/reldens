/**
 *
 * Reldens - ServerManager
 *
 * This class will handle the server initialization for the following processes: create the client app, connect to the
 * data server, initialize the features, define the rooms, create the client dist and start the game.
 *
 */

const dotenv = require('dotenv');
const path = require('path');
const { GameServer } = require('./game-server');
const { AppServer } = require('./app-server');
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
            // custom plugin goes even before config to catch up every single event:
            this.setupCustomServerPlugin(config);
            // initialize configurations:
            this.initializeConfiguration(config);
            // initialize theme:
            this.themeManager = new ThemeManager(config);
            this.themeManager.validateOrCreateTheme();
            // initialize storage:
            this.initializeStorage(config, dataServerDriver).catch((error) => {
                Logger.error('Storage could not be initialized.', error);
                process.exit();
            });
            // set storage driver on configuration manager:
            this.configManager.dataServer = this.dataServer;
            // load maps:
            MapsLoader.loadMaps(this.themeManager.projectThemePath, this.configManager);
        } catch (e) {
            Logger.error('Broken ServerManager.', e.message, e.stack);
            // @TODO - BETA - Improve error handler to not kill the process or automatically restart it.
            process.exit();
        }
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
        // save project root:
        if(sc.hasOwn(config, 'projectRoot')){
            this.projectRoot = config.projectRoot
        }
        Logger.info(['Project root:', this.projectRoot, 'Module root:', __dirname]);
        // setup dotenv to use the project root .env file:
        let envPath = path.join(this.projectRoot, '.env');
        dotenv.config({debug: process.env.DEBUG, path: envPath});
        // set the server host data:
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
        // hot-plug feature:
        this.isHotPlugEnabled = process.env.RELDENS_HOT_PLUG || false;
    }

    async start()
    {
        Logger.info('Starting Server Manager!');
        await this.createServer();
        await this.createGameServer();
        await this.initializeManagers();
        // after the rooms were loaded then finish the server process:
        await this.events.emit('reldens.serverBeforeListen', {serverManager: this});
        await this.gameServer.listen(this.configServer.port);
        Logger.info('Listening on '+this.configServer.host+':'+this.configServer.port);
        this.configManager.configList.server.baseUrl = this.configServer.host+':'+this.configServer.port;
        await this.createClientBundle();
        await this.events.emit('reldens.serverReady', {serverManager: this});
    }

    async createServer()
    {
        await this.events.emit('reldens.serverStartBegin', {serverManager: this});
        Object.assign(this, AppServer.createAppServer(this.themeManager.distPath));
    }

    async createGameServer()
    {
        // create game server instance:
        // this.gameServer = new GameServer({server: this.appServer, express: this.app});
        this.gameServer = new GameServer({
            transport: new WebSocketTransport({
                pingInterval: 5000,
                pingMaxRetries: 3,
                server: this.appServer
            })
        });
        // attach web monitoring panel (optional):
        if(this.configServer.monitor.enabled){
            this.gameServer.attachMonitor(this.app, this.configServer.monitor);
        }
    }

    async initializeManagers()
    {
        // get config processor instance:
        await this.configManager.loadConfigurations();
        // save project paths in config:
        this.configManager.projectPaths = this.themeManager.paths();
        await this.events.emit('reldens.serverConfigReady', {
            serverManager: this,
            configProcessor: this.configManager
        });
        // mailer:
        this.mailer = new Mailer();
        Logger.info(['Mailer Configured:', this.mailer.isEnabled()]);
        await ForgotPassword.defineRequestOnServerManagerApp(this);
        // features manager:
        this.featuresManager = new FeaturesManager({events: this.events, dataServer: this.dataServer});
        // load the available features list and append to the config, this way we will pass the list to the client:
        this.configManager.availableFeaturesList = await this.featuresManager.loadFeatures();
        await this.events.emit('reldens.serverConfigFeaturesReady', {
            serverManager: this,
            configProcessor: this.configManager
        });
        // users manager:
        this.usersManager = new UsersManager({events: this.events, dataServer: this.dataServer});
        // the "rooms" manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager({events: this.events, dataServer: this.dataServer});
        await this.events.emit('reldens.serverBeforeLoginManager', {serverManager: this});
        // login manager:
        this.loginManager = new LoginManager({
            config: this.configManager,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager,
            mailer: this.mailer,
            themeManager: this.themeManager,
            events: this.events
        });
        // prepare rooms:
        await this.events.emit('reldens.serverBeforeDefineRooms', {serverManager: this});
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: this.configManager,
            dataServer: this.dataServer
        });
    }

    async createClientBundle()
    {
        // @TODO - BETA - Remove this function, just move to an auto-install on first run feature.
        let runBundler = process.env.RELDENS_PARCEL_RUN_BUNDLER || false;
        if(!runBundler){
            return false;
        }
        if(process.env.RELDENS_ON_BUNDLE_RESET_DIST){
            await this.themeManager.resetDist();
        }
        if(process.env.RELDENS_ON_BUNDLE_RESET_DIST || process.env.RELDENS_ON_BUNDLE_COPY_ASSETS){
            await this.themeManager.copyAssetsToDist();
        }
        Logger.info('Running bundle on: ' + this.themeManager.projectIndexPath);
        await this.themeManager.buildClient();
    }

}

module.exports.ServerManager = ServerManager;
