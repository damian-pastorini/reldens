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
        // rooms manager:
        this.roomsManager = new RoomsManager({dataServer: this.dataServer});
        // features manager:
        this.featuresManager = new FeaturesManager();
        try{
            // prepare features:
            await this.featuresManager.loadAndInitFeatures();
            // prepare rooms:
            await this.roomsManager.defineRoomsInGameServe(this.gameServer, config);
            // after the rooms were loaded then finish the server process:
            this.gameServer.listen(config.app.port);
            console.log('INFO - Listening on http://localhost:'+config.app.port);
            // create bundle:
            this.bundler = new Parcel(config.projectRoot+'/pub/index.html');
            this.app.use(this.bundler.middleware());
        } catch (err) {
            console.log('ERROR - Rooms loader error.', err);
        }
    }

}

module.exports = ServerManager;
