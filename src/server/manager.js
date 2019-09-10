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
const DataServer = require('../storage/data-server');
const GameServer = require('./game-server');
const ConfigManager = require('../config/manager');
const RoomsManager = require('../rooms/manager');
const FeaturesManager = require('../features/manager');

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
        // data server:
        this.dataServer = new DataServer();
        // game monitor:
        if(configServer.monitor){
            // (optional) attach web monitoring panel:
            this.app.use('/monitor', this.gameServer.initMonitor());
            console.log('INFO - Attached monitor.');
        }
        // configuration data from database:
        this.configManager = new ConfigManager();
        // load configurations:
        let storedConfig = await this.configManager.loadConfigurations();
        // features manager:
        this.featuresManager = new FeaturesManager();
        // prepare features:
        await this.featuresManager.loadFeatures();
        // the rooms manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager({defineRooms: this.featuresManager.featuresWithRooms});
        // prepare rooms:
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, storedConfig);
        // after the rooms were loaded then finish the server process:
        this.gameServer.listen(configServer.port);
        console.log('INFO - Listening on '+configServer.host+':'+configServer.port);
        // create bundle:
        this.bundler = new Parcel(config.projectRoot+'/pub/index.html');
        this.app.use(this.bundler.middleware());
    }

}

module.exports = ServerManager;
