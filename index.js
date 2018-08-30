const colyseus = require('colyseus');
const http = require('http');

const express = require('express');
const app = express();
const port = Number(process.env.PORT || 8080);

const server = http.createServer(app);
const gameServer = new colyseus.Server({server: server});
gameServer.register('game_room', require('./server/rooms/game-room').gameroom);

const path = require('path');
const monitor = require('@colyseus/monitor');

app.use('/', express.static(path.join(__dirname, 'frontend')));

// (optional) attach web monitoring panel
app.use('/colyseus', monitor.monitor(gameServer));

gameServer.onShutdown(function(){
  console.log('Game Server is going down.');
});

gameServer.listen(port);
console.log('Listening on http://localhost:'+port);
