const config = require('./config/config');
const http = require('http');
const path = require('path');
const express = require('express');
const DataLink = require('./modules/datalink');
const Parcel = require('parcel-bundler');
const Colyseus = require('colyseus');
const RoomGame = require('./modules/room-game');
const RoomScene = require('./modules/room-scene');
const RoomChat = require('./modules/room-chat');
const share = require('../shared/constants');
// server:
const app = express();
const port = Number(config.app.port);
const server = http.createServer(app);
// game server:
const gameServer = new Colyseus.Server({server: server});
// main room:
gameServer.register(share.ROOM_GAME, RoomGame);
// game monitor:
if(config.app.colyseusMonitor){
    const monitor = require('@colyseus/monitor');
    // (optional) attach web monitoring panel:
    app.use('/colyseus', monitor.monitor(gameServer));
    console.log('NOTIFICATION - Attached Colyseus Monitor.');
}
// server shutdown:
gameServer.onShutdown(function(){
    console.log('NOTIFICATION - Game Server is going down.');
});
// loading game data:
let queryString = 'SELECT * FROM scenes';
let prom = new Promise((resolve, reject) => {
    DataLink.connection.query(queryString, {}, (err, rows) => {
        if(err){
            return reject({});
        }
        if(rows){
            resolve(rows);
        }
    });
});
// parsing data to register in the server:
prom.then(function(result){
    let counter = 0;
    if(result){
        // register room-scenes from database:
        for(let scene of result){
            let temp = {
                sceneName: scene.name,
                sceneKey: scene.scene_key,
                sceneMap: scene.scene_map,
                collisions: JSON.parse(scene.collisions),
                layers: JSON.parse(scene.layers),
                returnPositions: JSON.parse(scene.return_positions)
            };
            console.log('Registered scene: '+scene.name);
            gameServer.register(scene.name, RoomScene, {scene: temp});
            counter++;
        }
        // register global chat room:
        gameServer.register(share.CHAT_GLOBAL, RoomChat, {});
    }
    console.log(`Loaded ${counter} scenes`);
    // start game server:
    gameServer.listen(port);
    console.log('Listening on http://localhost:'+port);
    // create bundle:
    const bundler = new Parcel(path.resolve(__dirname, '../client/index.html'));
    app.use(bundler.middleware());
}).catch(function(err){
    console.log('ERROR - Server catch error:', err);
});
