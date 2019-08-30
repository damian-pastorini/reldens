const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Parcel = require('parcel-bundler');
const Colyseus = require('colyseus');

const RoomsManager = require('./rooms-manager');

const share = require('../utils/constants');
const config = require('../config/config');
const RoomGame = require('./room-game');
const RoomScene = require('./room-scene');
const RoomChat = require('../chat/room-chat');

class Server
{

    init()
    {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.port = Number(config.app.port);
        this.server = http.createServer(this.app);
        this.gameServer = new Colyseus.Server({
            server: this.server,
            express: this.app
        });
        // game monitor:
        if(config.app.colyseusMonitor){
            this.monitor = require('@colyseus/monitor');
            // (optional) attach web monitoring panel:
            this.app.use('/colyseus', this.monitor.monitor(this.gameServer));
            console.log('NOTIFICATION - Attached Colyseus Monitor.');
        }
        // server shutdown:
        this.gameServer.onShutdown(() => {
            console.log('NOTIFICATION - Game Server is going down.');
        });
        // register the rooms in the server:
        this.roomsManager = new RoomsManager();
        this.gameServer.listen(this.port);
        console.log('Listening on http://localhost:'+this.port);
        // create bundle:
        this.bundler = new Parcel(path.resolve(__dirname, '../../../pub/index.html'));
        this.app.use(bundler.middleware());
    }



}

module.exports = Server;