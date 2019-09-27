/**
 *
 * Reldens - ServerManager
 *
 * This class will handle the server initialization for the following processes: create the client app, connect to the
 * data server, initialize the features, define the rooms, create the client dist and start the game.
 *
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const Parcel = require('parcel-bundler');
const configServer = require('../../config/server');
const GameServer = require('./game-server');
const DataServer = require('../storage/data-server');
const ConfigManager = require('../config/manager');
const FeaturesManager = require('../features/manager');
const UsersManager = require('../users/manager');
const LoginManager = require('./login');
const RoomsManager = require('../rooms/manager');

class ServerManager
{

    /**
     * @param config
     * @returns {Promise<void>}
     */
    async start(config)
    {
        console.log('Server Manager - Start!');
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.appServer = http.createServer(this.app);
        // create game server instance:
        this.gameServer = new GameServer({server: this.appServer, express: this.app});
        // game monitor:
        if(configServer.monitor){
            // (optional) attach web monitoring panel:
            this.app.use('/monitor', this.gameServer.initMonitor());
            console.log('INFO - Attached monitor.');
        }
        // data server:
        this.dataServer = new DataServer();
        // configuration data from database:
        this.configManager = new ConfigManager();
        // load configurations:
        let storedConfig = await this.configManager.loadConfigurations();
        // features manager:
        this.featuresManager = new FeaturesManager();
        // load the available features list and append to the config, this way we will pass the list to the client:
        storedConfig.availableFeaturesList = await this.featuresManager.loadFeatures();
        // users manager:
        this.usersManager = new UsersManager();
        // the rooms manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager({
            defineRooms: this.featuresManager.featuresWithRooms,
            messageActions: this.featuresManager.messageActions
        });
        // login manager:
        this.loginManager = new LoginManager({
            config: storedConfig,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager
        });
        // prepare rooms:
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: storedConfig
        });
        // after the rooms were loaded then finish the server process:
        this.gameServer.listen(configServer.port);
        console.log('INFO - Listening on '+configServer.host+':'+configServer.port);
        // create bundle:
        this.bundler = new Parcel(config.projectRoot+'/pub/index.html');
        this.app.use(this.bundler.middleware());
    }

}

module.exports = ServerManager;
