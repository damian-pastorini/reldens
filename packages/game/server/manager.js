/**
 *
 * Reldens - ServerManager
 *
 * This class will handle the server initialization for the following processes: create the client app, connect to the
 * data server, initialize the features, define the rooms, create the client dist and start the game.
 *
 */

const dotenv = require('dotenv');
const http = require('http');
const express = require('express');
const cors = require('cors');
const Parcel = require('parcel-bundler');
const { GameServer } = require('./game-server');
const { DataServer } = require('@reldens/storage');
const { ConfigManager } = require('../../config/server/manager');
const { FeaturesManager } = require('../../features/server/manager');
const { UsersManager } = require('../../users/server/manager');
const { LoginManager } = require('./login');
const { RoomsManager } = require('../../rooms/server/manager');
const { ThemeManager } = require('./theme-manager');
const { MapsLoader } = require('./maps-loader');
const { Logger, EventsManager } = require('@reldens/utils');

class ServerManager
{

    constructor(config)
    {
        // initialize configurations:
        this.initializeConfiguration(config);
        // server events:
        this.events = EventsManager;
        // initialize storage:
        DataServer.initialize();
        ThemeManager.validateOrCreateTheme(config);
        MapsLoader.loadMaps(config.projectRoot+ThemeManager.projectTheme, this.configManager);
    }

    initializeConfiguration(config)
    {
        // configuration data from database:
        this.configManager = new ConfigManager();
        // save project root:
        this.projectRoot = config.projectRoot || './';
        Logger.info(['Project root:', this.projectRoot, 'Module root:', __dirname]);
        // setup dotenv to use the project root .env file:
        dotenv.config({debug: process.env.DEBUG, path: this.projectRoot+'/.env'});
        // setup the server host data:
        this.configServer = {
            port: Number(process.env.PORT) || Number(process.env.RELDENS_APP_PORT) || 8080,
            host: process.env.RELDENS_APP_HOST || 'http://localhost',
            monitor: process.env.RELDENS_MONITOR || false
        };
        if(config.customClasses){
            this.configManager.configList.server.customClasses = config.customClasses;
        } else {
            Logger.error('\nMissing customClasses definition!'
                +'\nYou can pass an empty object to avoid this or copy into your theme the default file from:'
                +'\nnode_modules/reldens/theme/packages/server.js'
                +'\nNormally a default copy is been made automatically on the first time you run the project.'
                +'\nThen you need to require the module and pass it as property in your ServerManager initialization.'
                +'\nFor reference check the theme/project-index.js.sample file, you probably just need to uncomment'
                +' the customClasses related lines.\n');
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async start()
    {
        Logger.info('Starting Server Manager!');
        await this.createServer();
        await this.initializeManagers();
        // after the rooms were loaded then finish the server process:
        await EventsManager.emit('reldens.serverBeforeListen', {serverManager: this});
        await this.gameServer.listen(this.configServer.port);
        Logger.info('Listening on '+this.configServer.host+':'+this.configServer.port);
        await this.createClientBundle();
        await EventsManager.emit('reldens.serverReady', {serverManager: this});
    }

    async createServer()
    {
        await EventsManager.emit('reldens.serverStartBegin', {serverManager: this});
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.appServer = http.createServer(this.app);
        // create game server instance:
        this.gameServer = new GameServer({server: this.appServer, express: this.app});
        // game monitor:
        if(this.configServer.monitor){
            // (optional) attach web monitoring panel:
            this.app.use('/monitor', this.gameServer.initMonitor());
            Logger.info('Attached monitor.');
        }
    }

    async initializeManagers()
    {
        // get config processor instance:
        let configProcessor = await this.configManager.loadAndGetProcessor();
        // save project root for later use:
        configProcessor.projectRoot = this.projectRoot;
        // theme root:
        configProcessor.projectTheme = ThemeManager.projectTheme;
        await EventsManager.emit('reldens.serverConfigReady', {serverManager: this, configProcessor: configProcessor});
        // features manager:
        this.featuresManager = new FeaturesManager();
        // load the available features list and append to the config, this way we will pass the list to the client:
        configProcessor.availableFeaturesList = await this.featuresManager.loadFeatures();
        await EventsManager.emit('reldens.serverConfigFeaturesReady', {serverManager: this, configProcessor: configProcessor});
        // users manager:
        this.usersManager = new UsersManager();
        // the rooms manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager();
        await EventsManager.emit('reldens.serverBeforeLoginManager', {serverManager: this});
        // login manager:
        this.loginManager = new LoginManager({
            config: configProcessor,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager
        });
        // prepare rooms:
        await EventsManager.emit('reldens.serverBeforeDefineRooms', {serverManager: this});
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: configProcessor
        });
    }

    async createClientBundle()
    {
        let runBundler = process.env.RELDENS_PARCEL_RUN_BUNDLER || false;
        if(!runBundler){
            return;
        }
        // create bundle:
        const bundlerOptions = {
            production: process.env.NODE_ENV === 'production',
            sourceMaps: process.env.RELDENS_PARCEL_SOURCEMAPS || false
        };
        Logger.info(this.projectRoot + ThemeManager.projectTheme + '/index.html');
        this.bundler = new Parcel(this.projectRoot + ThemeManager.projectTheme + '/index.html', bundlerOptions);
        await this.bundler.bundle();
        let middleware = this.bundler.middleware();
        this.app.use(middleware);
    }

}

module.exports.ServerManager = ServerManager;
