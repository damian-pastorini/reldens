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
const { AppServerFactory } = require('@reldens/server-utils');
const { HomepageLoader } = require('./homepage-loader');
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
const { RoomScene } = require('../../rooms/server/scene');
const { GameConst } = require('../constants');
const { ChatConst } = require('../../chat/constants');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

class ServerManager
{

    app = false;
    appServer = {};
    gameServer = false;
    events = false;
    dataServerDriver = false;
    dataServerConfig = {};
    dataServer = false;
    autoGenerateEntities = true;
    rawConfig = false;
    configManager = {};
    projectRoot = './';
    configServer = false;
    mailer = false;
    featuresManager = false;
    roomsManager = false;
    loginManager = false;
    usersManager = false;
    translations = {};

    constructor(config, eventsManager, dataServerDriver)
    {
        Logger.debug('Main server instance creation.', {config});
        this.rawConfig = config;
        this.dataServerDriver = dataServerDriver;
        this.events = eventsManager || EventsManagerSingleton;
        this.themeManager = new ThemeManager(config);
        dotenv.config({debug: process.env.DEBUG, path: this.themeManager.envFilePath});
        this.appServerFactory = new AppServerFactory();
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
        this.isHotPlugEnabled = 1 === Number(process.env.RELDENS_HOT_PLUG || 1);
        this.guestsEmailDomain = String(process.env.RELDENS_GUESTS_EMAIL_DOMAIN || '@guest-reldens.com');
    }

    fetchConfigServerFromEnvironmentVariables()
    {
        let host = String(process.env.RELDENS_APP_HOST || 'http://localhost');
        let port = Number(process.env.PORT || 0);
        if(0 === port){
            port = Number(process.env.RELDENS_APP_PORT || 0);
            if(0 === port){
                port = 8080;
            }
        }
        let environmentConfig = {
            appServerConfig: {
                encoding: String(process.env.RELDENS_DEFAULT_ENCODING || 'utf-8'),
                useHttps: 1 === Number(process.env.RELDENS_EXPRESS_USE_HTTPS || 0),
                passphrase: String(process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE || ''),
                httpsChain: String(process.env.RELDENS_EXPRESS_HTTPS_CHAIN || ''),
                keyPath: String(process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY || ''),
                certPath: String(process.env.RELDENS_EXPRESS_HTTPS_CERT || ''),
                trustedProxy: String(process.env.RELDENS_EXPRESS_TRUSTED_PROXY || ''),
                windowMs: Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MS || 60000),
                maxRequests: Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS || 30),
                applyKeyGenerator: 1 === Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_APPLY_KEY_GENERATOR || 0),
                useHelmet: false
            },
            host,
            port,
            publicUrl: String(process.env.RELDENS_PUBLIC_URL || host+':'+port),
            monitor: {
                enabled: 1 === Number(process.env.RELDENS_MONITOR || 0) || false,
                auth: Boolean(process.env.RELDENS_MONITOR_AUTH || false),
                user: process.env.RELDENS_MONITOR_USER || '',
                pass: process.env.RELDENS_MONITOR_PASS || '',
            }
        };
        Logger.info('Server environment configuration:', environmentConfig);
        return environmentConfig;
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
        Logger.info('Storage connected.', {config: dataServerConfig.config, initialized: dataServer.initialized});
        if(this.autoGenerateEntities){
            await dataServer.generateEntities();
            Logger.info('Storage entities generated.', {entities: Object.keys(dataServerConfig.loadedEntities)});
        }
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
            // @NOTE: at this point the environment variables could be changed by the .env created by the installer.
            this.configServer = this.fetchConfigServerFromEnvironmentVariables();
            let createdAppServer = this.appServerFactory.createAppServer(this.configServer.appServerConfig);
            if(this.appServerFactory.error.message){
                Logger.error(this.appServerFactory.error.message);
                return false;
            }
            this.app = createdAppServer.app;
            this.appServer = createdAppServer.appServer;
        }
        this.setupCustomServerPlugin(this.rawConfig);
        await this.initializeStorage(this.rawConfig, this.dataServerDriver);
        this.configManager.dataServer = this.dataServer;
        await this.initializeConfigManager();
        await this.enableServeStaticsAndHomePage();
        await this.themeManager.validateOrCreateTheme();
        return await this.startGameServerInstance();
    }

    async startGameServerInstance()
    {
        MapsLoader.reloadMaps(this.themeManager.projectThemePath, this.configManager);
        await this.createGameServer();
        if(!this.validateServer()){
            return false;
        }
        if(!await this.initializeManagers()){
            return false;
        }
        await this.events.emit('reldens.serverBeforeListen', {serverManager: this});
        await this.gameServer.listen(this.configServer.port);
        this.configManager.configList.server.baseUrl = this.configServer.host + ':' + this.configServer.port;
        this.configManager.configList.server.publicUrl = this.configServer.publicUrl;
        this.showInfoLogs();
        await this.events.emit('reldens.serverReady', {serverManager: this});
        return this;
    }

    validateServer()
    {
        if(!this.appServer){
            Logger.critical('App Server is not defined.');
            return false;
        }
        if(!this.gameServer){
            Logger.critical('Game Server is not defined.');
            return false;
        }
        return true;
    }

    showInfoLogs()
    {
        Logger.info('info', 'Server ready.' + ReldensASCII);
        Logger.info('Main packages:', [
            'parcel: ' + PackageData.dependencies['@parcel/core'],
            'colyseus: ' + PackageData.dependencies['@colyseus/core'],
            'phaser: ' + PackageData.dependencies['phaser'],
            'firebase: ' + PackageData.dependencies['firebase'],
            'reldens/utils: ' + PackageData.dependencies['@reldens/utils'],
            'reldens/storage: ' + PackageData.dependencies['@reldens/storage'],
            'reldens/modifiers: ' + PackageData.dependencies['@reldens/modifiers'],
            'reldens/items-system: ' + PackageData.dependencies['@reldens/items-system'],
            'reldens/skills: ' + PackageData.dependencies['@reldens/skills'],
        ]);
        Logger.info('Server listening on ' + this.configServer.host + ':' + this.configServer.port);
    }

    async createServers()
    {
        await this.createAppServer();
        if(!this.installer.isInstalled()){
            Logger.info('Reldens not installed, preparing setup procedure.');
            return await this.installer.prepareSetup(this.app, this.appServerFactory);
        }
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
        Object.assign(this, this.appServerFactory.createAppServer(this.configServer.appServerConfig));
    }

    async enableServeStaticsAndHomePage()
    {
        if(1 === Number(process.env.RELDENS_EXPRESS_SERVE_HOME || 0)){
            let populatedConfigFile = HomepageLoader.createConfigFile(
                this.themeManager.projectThemePath,
                Object.assign({}, this.configManager.gameEngine, {client: this.configManager.client})
            );
            if(!populatedConfigFile){
                Logger.error('Failed to create config file for homepage.');
            }
            // if the config file is populated, we need to rebuild the client to get the contents on the dist folder:
            await this.themeManager.buildClient();
            await this.appServerFactory.enableServeHome(this.app, async (req) => {
                return await HomepageLoader.loadContents(req.query?.lang, this.themeManager.distPath);
            });
        }
        if(1 === Number(process.env.RELDENS_EXPRESS_SERVE_STATICS || 0)){
            await this.appServerFactory.serveStatics(this.app, this.themeManager.distPath);
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
        this.gameServer = new GameServer({transport: new WebSocketTransport(options)});
        if(this.configServer.monitor.enabled){
            this.gameServer.attachMonitor(this.app, this.configServer.monitor);
        }
    }

    async initializeManagers()
    {
        let event = {serverManager: this, continueProcess: true};
        await this.events.emit('reldens.beforeInitializeManagers', event);
        if(!event.continueProcess){
            return false;
        }
        Logger.info('Initialize Managers.');
        await this.initializeMailer();
        await this.initializeFeaturesManager();
        this.initializeUsersManager();
        await this.initializeRoomsManager();
        this.initializeLoginManager();
        await this.defineServerRooms();
        return true;
    }

    async defineServerRooms()
    {
        await this.events.emit('reldens.serverBeforeDefineRooms', {serverManager: this});
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: this.configManager,
            dataServer: this.dataServer,
            featuresManager: this.featuresManager
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
            events: this.events,
            configServer: this.configServer,
            appServer: this.appServer
        });
    }

    async initializeRoomsManager()
    {
        // the "rooms" manager will receive the rooms configured on the features to be defined:
        this.roomsManager = new RoomsManager({
            events: this.events,
            dataServer: this.dataServer,
            config: this.configManager
        });
        await this.events.emit('reldens.serverBeforeLoginManager', {serverManager: this});
    }

    initializeUsersManager()
    {
        this.usersManager = new UsersManager({
            events: this.events,
            dataServer: this.dataServer,
            config: this.configManager
        });
    }

    async initializeFeaturesManager()
    {
        this.featuresManager = new FeaturesManager({
            events: this.events,
            dataServer: this.dataServer,
            config: this.configManager,
            themeManager: this.themeManager
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
            if(!result){
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
        this.configGuestEmailDomain();
        await this.configRoomsServerUrl();
        await this.events.emit('reldens.serverConfigReady', {serverManager: this, configProcessor: this.configManager});
    }

    configGuestEmailDomain()
    {
        let customGuestEmailDomain = this.configManager.getWithoutLogs('server/players/guestsUser/emailDomain', '');
        if('' === customGuestEmailDomain){
            sc.deepMergeProperties(
                this.configManager,
                {server: {players: {guestsUser: {emailDomain: this.guestsEmailDomain}}}}
            );
            return;
        }
        this.guestsEmailDomain = customGuestEmailDomain;
    }

    async configRoomsServerUrl()
    {
        let roomsRepository = this.dataServer.getEntity('rooms');
        let rooms = await roomsRepository.loadAll();
        if(!rooms || 0 === rooms.length){
            return;
        }
        let servers = {};
        for(let room of rooms){
            servers[room.name] = room.server_url
                || this.configServer.publicUrl
                || this.configServer.host+':'+this.configServer.port;
        }
        sc.deepMergeProperties(this.configManager, {client: {rooms: {servers}}});
    }

    async serverBroadcast(props)
    {
        if(!props.message){
            return false;
        }
        if(!this.roomsManager?.createdInstances){
            Logger.info('Room manager not available, make sure the callback is bind to this class.');
            return false;
        }
        let messageSendModel = {
            [GameConst.ACTION_KEY]: ChatConst.CHAT_ACTION,
            [ChatConst.TYPES.KEY]: ChatConst.TYPES.ERROR,
            [ChatConst.MESSAGE.KEY]: props.message,
        };
        let roomsKeys = Object.keys(this.roomsManager.createdInstances);
        for(let roomKey of roomsKeys){
            let room = this.roomsManager.createdInstances[roomKey];
            if(room instanceof RoomScene){
                room.broadcast('*', messageSendModel);
            }
        }
        return true;
    }

}

module.exports.ServerManager = ServerManager;
