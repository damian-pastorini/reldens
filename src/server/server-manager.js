/**
 *
 * Reldens - Server
 *
 * This class will handle the server initialization, getting all the required data from the storage, start the game
 * server, create the client app, etc.
 *
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const Parcel = require('parcel-bundler');
const DataServer = require('../storage/data-server');
const GameServer = require('./game-server');
const RoomsManager = require('./rooms-manager');
const FeaturesManager = require('./features-manager');

class ServerManager
{

    async start(config)
    {
        console.log('Server Manager - Start!');
        if(!config){
            throw new Error('ERROR - Missing server configuration.');
        }
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.appServer = http.createServer(this.app);
        // data server:
        this.dataServer = new DataServer(config.db);
        // create game server instance:
        this.gameServer = new GameServer({server: this.appServer, express: this.app});
        // game monitor:
        if(config.app.monitor){
            // (optional) attach web monitoring panel:
            this.app.use('/monitor', this.gameServer.initMonitor());
            console.log('INFO - Attached monitor.');
        }
        // features manager will receive the dataServer and all the available features from the config file:
        let featuresOptions = {
            dataServer: this.dataServer,
            availableFeatures: config.features
        };
        // features manager:
        this.featuresManager = new FeaturesManager(featuresOptions);
        // prepare features:
        await this.featuresManager.loadFeatures();
        // the rooms manager will receive the dataServer and the features rooms to be defined:
        let roomManagerOptions = {
            dataServer: this.dataServer,
            defineRooms: this.featuresManager.featuresWithRooms
        };
        // rooms manager:
        this.roomsManager = new RoomsManager(roomManagerOptions);
        // prepare rooms:
        await this.roomsManager.defineRoomsInGameServe(this.gameServer, config);
        // after the rooms were loaded then finish the server process:
        this.gameServer.listen(config.app.port);
        console.log('INFO - Listening on http://localhost:'+config.app.port);
        // create bundle:
        this.bundler = new Parcel(config.projectRoot+'/pub/index.html');
        this.app.use(this.bundler.middleware());
    }

}

module.exports = ServerManager;
