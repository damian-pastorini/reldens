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
const { ServerEvents } = require('./server-events');
const { GameServer } = require('./game-server');
const { DataServer } = require('./data-server');
const { ConfigManager } = require('../../config/server/manager');
const { FeaturesManager } = require('../../features/server/manager');
const UsersManager = require('../../users/server/manager');
const LoginManager = require('./login');
const RoomsManager = require('../../rooms/server/manager');
const { ThemeManager } = require('./theme-manager');
const { Logger } = require('../logger');

class ServerManager
{

    constructor(config)
    {
        this.projectRoot = config.projectRoot || './';
        dotenv.config({debug: process.env.DEBUG, path: this.projectRoot+'/.env'});
        this.configServer = {
            port: Number(process.env.PORT) || Number(process.env.RELDENS_APP_PORT) || 8080,
            host: process.env.RELDENS_APP_HOST || 'http://localhost',
            monitor: process.env.RELDENS_MONITOR || false
        };
        this.events = ServerEvents;
        this.dataServer = new DataServer();
        ThemeManager.validateOrCreateTheme(config);
        Logger.info(['INFO - Defined project root:', this.projectRoot,  __dirname]);
    }

    /**
     * @returns {Promise<void>}
     */
    async start()
    {
        Logger.info('Starting Server Manager!');
        this.createServer();
        await this.initializeManagers();
        // after the rooms were loaded then finish the server process:
        ServerEvents.emit('serverBeforeListen', {serverManager: this});
        this.gameServer.listen(this.configServer.port);
        Logger.info('Listening on '+this.configServer.host+':'+this.configServer.port);
        await this.createClientBundle();
        ServerEvents.emit('serverReady', {serverManager: this});
    }

    createServer()
    {
        ServerEvents.emit('serverStartBegin', {serverManager: this});
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
        // configuration data from database:
        this.configManager = new ConfigManager();
        // get config processor instance:
        let configProcessor = await this.configManager.loadAndGetProcessor();
        // save project root for later use:
        configProcessor.projectRoot = this.projectRoot;
        // theme root:
        configProcessor.projectTheme = ThemeManager.projectTheme;
        ServerEvents.emit('serverConfigReady', {serverManager: this, configProcessor: configProcessor});
        // features manager:
        this.featuresManager = new FeaturesManager();
        // load the available features list and append to the config, this way we will pass the list to the client:
        configProcessor.availableFeaturesList = await this.featuresManager.loadFeatures();
        ServerEvents.emit('serverConfigFeaturesReady', {serverManager: this, configProcessor: configProcessor});
        // users manager:
        this.usersManager = new UsersManager();
        // the rooms manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager({
            defineRooms: this.featuresManager.featuresWithRooms,
            messageActions: this.featuresManager.messageActions
        });
        ServerEvents.emit('serverBeforeLoginManager', {serverManager: this});
        // login manager:
        this.loginManager = new LoginManager({
            config: configProcessor,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager
        });
        // prepare rooms:
        ServerEvents.emit('serverBeforeDefineRooms', {serverManager: this});
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: configProcessor
        });
    }

    async createClientBundle()
    {
        // @TODO: analyze how to split the bundle from the server and if possible to avoid the middleware from Parcel.
        // create bundle:
        const bundlerOptions = { production: process.env.NODE_ENV === 'production' };
        Logger.info(this.projectRoot + ThemeManager.projectTheme + '/index.html');
        this.bundler = await new Parcel(this.projectRoot + ThemeManager.projectTheme + '/index.html', bundlerOptions);
        this.app.use(this.bundler.middleware());
    }

}

module.exports.ServerManager = ServerManager;