import * as path from 'path';
import * as express from 'express';
import * as serveIndex from 'serve-index';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';

// import room handlers
import { GameRoom } from "./rooms/game-room";

const port = Number(process.env.PORT || 8080);
const app = express();

// Attach WebSocket Server on HTTP Server.
const gameServer = new Server({
  server: createServer(app)
});

// register GameRoom as "game_room"
gameServer.register('game_room', GameRoom);

// Register ChatRoom with initial options, as "chat_with_options"
// onInit(options) will receive client join options + options registered here.
// gameServer.register('chat_with_options', GameRoom, {
//     custom_options: 'you can use me on Room#onInit'
// });

app.use('/', express.static(path.join(__dirname, "static")));
app.use('/', serveIndex(path.join(__dirname, "static"), {'icons': true}))

// (optional) attach web monitoring panel
app.use('/colyseus', monitor(gameServer));

gameServer.onShutdown(function(){
  console.log('Game Server is going down.');
});

gameServer.listen(port);
console.log(`Listening on http://localhost:${ port }`);
