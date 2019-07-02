const config = require('./config/config');
const http = require('http');
const path = require('path');
const express = require('express');
const DataLink = require('./modules/datalink');
const Parcel = require('parcel-bundler');
const Colyseus = require('colyseus');
const RoomGame = require('./modules/room-game').roomgame;
const RoomScene = require('./modules/room-scene').roomscene;
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
prom.then(function(result){
    let counter = 0;
    if(result){
        for(let scene of result){
            let temp = {
                sceneKey: scene.scene_key,
                sceneMap: scene.scene_map,
                collisions: JSON.parse(scene.collisions),
                layers: JSON.parse(scene.layers),
                returnPositions: JSON.parse(scene.return_positions),
                sceneName: scene.name
            };
            console.log('Registered scene: '+scene.name);
            gameServer.register(scene.name, RoomScene, {scene: temp});
            counter++;
        }
    }
    console.log('Loaded '+counter+' scenes');
    // start:
    gameServer.listen(port);
    console.log('Listening on http://localhost:'+port);
    // bundler:
    const bundler = new Parcel(path.resolve(__dirname, '../client/index.html'));
    app.use(bundler.middleware());
}).catch(function(err){
    console.log('ERROR - Server catch error:', err);
});
