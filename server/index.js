const config = require('./config/server.json');
const http = require('http');
const path = require('path');
const express = require('express');
const Parcel = require('parcel-bundler');
const Colyseus = require('colyseus');
const gameroom = require('./rooms/game-room').gameroom;
// server:
const app = express();
const port = Number(process.env.PORT || config.port);
const server = http.createServer(app);
// game server:
const gameServer = new Colyseus.Server({server: server});
gameServer.register('game_room', gameroom);
// game monitor:
if(config.colyseus_monitor){
    const monitor = require('@colyseus/monitor');
    // (optional) attach web monitoring panel
    app.use('/colyseus', monitor.monitor(gameServer));
}
// bundler:
const bundler = new Parcel(path.resolve(__dirname, '../client/index.html'));
app.use(bundler.middleware());
// server shutdown:
gameServer.onShutdown(function(){
  console.log('Game Server is going down.');
});
// start:
gameServer.listen(port);
console.log('Listening on http://localhost:'+port);
