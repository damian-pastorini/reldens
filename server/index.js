const config = require('./config/server.json');
const Parcel = require('parcel-bundler');
const colyseus = require('colyseus');
const http = require('http');
const path = require('path');
const gameroom = require('./rooms/game-room').gameroom;

const express = require('express');
const app = express();
const port = Number(process.env.PORT || config.port);

const server = http.createServer(app);
const gameServer = new colyseus.Server({server: server});
gameServer.register('game_room', gameroom);

const monitor = require('@colyseus/monitor');

const bundler = new Parcel(path.resolve(__dirname, '../client/index.html'));
app.use(bundler.middleware());

// (optional) attach web monitoring panel
app.use('/colyseus', monitor.monitor(gameServer));

gameServer.onShutdown(function(){
  console.log('Game Server is going down.');
});

gameServer.listen(port);
console.log('Listening on http://localhost:'+port);
